import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import serviciosRoutes from './routes/servicios.js';
import paquetesRoutes from './routes/paquetes.js';
import webhooksRoutes from './routes/webhooks.js';
import usersRoutes from './routes/users.js';
import cmsRoutes from './routes/cms.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';
import demoRoutes from './routes/demo.js';
import crmRoutes from './routes/crm.js';
import contactRoutes from './routes/contact.js';
import categoriasRoutes from './routes/categorias.js';
import clientRoutes from './routes/client.js';
import blogRoutes from './routes/blog.js';
import commentsRoutes from './routes/comments.js';
import profileRoutes from './routes/profile.js';
import userBlogRoutes from './routes/userBlog.js';
import agentsRoutes from './routes/agents.js';
import gerenteRoutes from './routes/gerente.js';
import agentTestingRoutes from './routes/agentTesting.js';
import aiAnalyticsRoutes from './routes/ai/analytics.js';
import eventRoutes from './routes/events.js';
import agentAgendaRoutes from './routes/agentAgenda.js';
import seoMonitorRoutes from './routes/seo-monitor.js';
import agentsBlogSessionRoutes from './routes/agents-blog-session.js';
import directMessagesRoutes from './routes/directMessages.js';
import notificationsRoutes from './routes/notifications.js';
import { cmsLogger } from './middleware/logger.js';
import { 
  initializeSecurityMiddleware, 
  generalLimiter, 
  authLimiter, 
  contactLimiter, 
  aiChatLimiter,
  auditLog 
} from './middleware/securityMiddleware.js';
import { initializeDatabase, checkDatabaseHealth } from './utils/dbInitializer.js';
import { inicializarCategorias } from './utils/categoriaInitializer.js';
import { inicializarPlantillasMensajes } from './utils/messageInitializer.js';
import { inicializarCache } from './utils/cacheInitializer.js';
import { initializeAllAgents } from './utils/agentInitializer.js';
import logger from './utils/logger.js';
import INIT_CONFIG, { isProductionMode } from './config/initConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// 🚀 INICIALIZACIÓN SECUENCIAL
// ========================================
// IMPORTANTE: No iniciar servidor hasta que DB esté lista
let isDbReady = false;
let isShuttingDown = false; // Flag para graceful shutdown

// Función de inicialización asíncrona
async function initializeServer() {
  try {
    logger.startup('Iniciando THADO Consulting Backend Server');
    
    // 1. Conectar a MongoDB PRIMERO
    await connectDB();
    logger.success('Conexión a MongoDB establecida');
    
    // 2. Verificar modo de inicialización
    if (isProductionMode()) {
      logger.info('🚀 Modo PRODUCCIÓN: Inicializaciones de datos desactivadas');
    } else {
      logger.info('🔧 Modo DESARROLLO: Ejecutando inicializaciones activas...');
    }
    
    // 3. Inicializar datos (respetan INIT_CONFIG internamente)
    await initializeDatabase();
    await inicializarCategorias();
    await inicializarPlantillasMensajes();
    await inicializarCache();
    await initializeAllAgents();
    
    // 4. Marcar DB como lista
    isDbReady = true;
    logger.success('✅ Base de datos conectada y lista');
    
    return true;
  } catch (err) {
    logger.error('❌ Error durante inicialización:', err);
    throw err; // Re-lanzar para manejar en el startup
  }
}

// NO iniciar aquí - se hace al final con startServer()

// IMPORTANTE: Webhooks deben ir ANTES de los middlewares de JSON
// porque necesitan el raw body para verificar la firma
app.use('/api/webhooks', webhooksRoutes);

// ========================================
// 🛡️ SECURITY MIDDLEWARE (HELMET + HEADERS)
// ========================================
initializeSecurityMiddleware(app);

// Audit logging para todas las requests
app.use(auditLog);

// Middlewares
// CORS configurado para permitir frontend específico con fallbacks seguros
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'https://thadoconsulting.vercel.app',
      'https://thado-web.vercel.app',
      'https://www.thadoconsulting.com',
      'https://thadoconsulting.com'
    ];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (como apps móviles o curl)
    if (!origin) return callback(null, true);

    // Verificar si el origin está en la lista permitida
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } 
    // En desarrollo, ser más permisivo con localhost
    else if (process.env.NODE_ENV === 'development' && origin && 
             (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      callback(null, true);
    }
    // Verificar patrones de dominios de producción conocidos
    else if (origin && (
      origin.includes('thado') || 
      origin.includes('thadoconsulting') || 
      origin.includes('vercel.app') ||
      origin.includes('netlify.app')
    )) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// ========================================
// � LOGGING CF-RAY HEADER (Render/Cloudflare)
// ========================================
app.use((req, res, next) => {
  const cfRay = req.headers['cf-ray'];
  if (cfRay) {
    // Agregar CF-Ray al request para logging posterior
    req.cfRay = cfRay;
    // Log temprano de la request para debugging en Render
    if (process.env.NODE_ENV === 'production') {
      logger.debug(`[CF-Ray: ${cfRay}] ${req.method} ${req.path}`);
    }
  }
  next();
});

// ========================================
// 🛑 MIDDLEWARE DE GRACEFUL SHUTDOWN
// ========================================
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.set('Connection', 'close');
    return res.status(503).json({
      success: false,
      message: 'Servidor reiniciándose. Intenta de nuevo en unos segundos.',
      code: 'SERVER_SHUTTING_DOWN'
    });
  }
  next();
});

// ========================================
// �🛡️ MIDDLEWARE DE SEGURIDAD Y LÍMITES
// ========================================
// NOTA: Rate limiting ahora se aplica por ruta específica en la sección de rutas
// usando los limiters importados desde securityMiddleware.js

// Limitar tamaño de payload JSON (previene ataques de memoria)
app.use(express.json({ 
  limit: '2mb', // Max 2MB por request JSON
  strict: true
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '2mb' 
}));

// Middleware para subir archivos (configuración mejorada)
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 5 * 1024 * 1024,  // 5MB por archivo
    files: 5                     // Max 5 archivos simultáneos
  },
  abortOnLimit: true,
  responseOnLimit: 'El archivo excede el tamaño máximo permitido (5MB)',
  useTempFiles: true,            // Usar archivos temporales en vez de memoria
  tempFileDir: '/tmp/',
  safeFileNames: true,           // Sanitizar nombres de archivo
  preserveExtension: true
}));

// ========================================
// 📊 MONITOREO DE MEMORIA (Middleware)
// ========================================
app.use((req, res, next) => {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  
  // Advertencia si el uso de memoria es alto
  if (heapUsedMB > 400) {
    logger.warn(`⚠️ High memory usage: ${heapUsedMB}MB`);
  }
  
  // Rechazar requests si la memoria está crítica (>500MB)
  if (heapUsedMB > 500) {
    logger.error(`🚨 Critical memory usage: ${heapUsedMB}MB - Rejecting request`);
    return res.status(503).json({
      success: false,
      message: 'Servidor temporalmente sobrecargado. Intenta de nuevo en unos momentos.',
      code: 'MEMORY_OVERLOAD'
    });
  }
  
  next();
});

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de logging para CMS (debe ir antes de las rutas)
app.use(cmsLogger);

// Rutas
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API THADO Consulting funcionando correctamente',
    version: '1.0.0',
    status: 'OK'
  });
});

// ========================================
// 💓 HEALTH CHECK PARA RENDER
// ========================================
// Este endpoint es usado por Render para verificar que el servicio está listo
// Debe retornar 200 SOLO cuando el servidor está completamente operativo
app.get('/health', async (req, res) => {
  // Si está cerrándose, retornar 503
  if (isShuttingDown) {
    return res.status(503).json({
      success: false,
      message: 'Server is shutting down',
      ready: false
    });
  }
  
  // Si la DB no está lista, retornar 503 (Render reintentará)
  if (!isDbReady) {
    return res.status(503).json({
      success: false,
      message: 'Database not ready',
      ready: false
    });
  }
  
  // Verificar conexión real a MongoDB
  try {
    const dbState = mongoose.connection.readyState;
    // 1 = connected, 2 = connecting
    if (dbState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection lost',
        dbState: dbState,
        ready: false
      });
    }
    
    // Todo OK - servicio saludable
    res.status(200).json({
      success: true,
      message: 'Backend is healthy',
      ready: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      uptime: Math.round(process.uptime()),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      ready: false
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { checkDatabaseHealth } = await import('./utils/dbInitializer.js');
    const dbHealth = await checkDatabaseHealth();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message
    });
  }
});

// Endpoint mejorado para el dashboard
app.get('/api/dashboard-status', async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.debug('Procesando request de dashboard status');
    
    const dbHealth = await checkDatabaseHealth();
    
    // Información del servidor
    const serverInfo = {
      status: 'Conectado exitosamente ✅',
      message: '🚀 Backend funcionando correctamente',
      database: {
        connected: dbHealth.healthy,
        host: process.env.MONGODB_URI ? 'MongoDB Atlas' : 'localhost',
        name: 'thado-consulting',
        status: dbHealth.healthy ? 'Conectado ✅' : 'Desconectado ❌'
      },
      server: {
        port: process.env.PORT || 5000,
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      }
    };

    logger.api('GET', '/api/dashboard-status', 200, Date.now() - startTime);
    
    res.json({
      success: true,
      data: serverInfo
    });
  } catch (error) {
    logger.error('Error en endpoint dashboard-status', error);
    logger.api('GET', '/api/dashboard-status', 500, Date.now() - startTime);
    
    res.status(500).json({
      success: false,
      message: '❌ Error de conexión',
      error: error.message
    });
  }
});

// Endpoint para información del proyecto
app.get('/api/project-info', async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.debug('Procesando request de project info');
    
    const Page = (await import('./models/Page.js')).default;
    
    // Obtener información de las páginas
    const pages = await Page.find({}).select('pageSlug pageName isPublished lastUpdated updatedBy');
    const homePage = pages.find(p => p.pageSlug === 'home');
    
    logger.database('QUERY', 'pages', { found: pages.length });
    
    const projectInfo = {
      empresa: 'THADO Consulting',
      descripcion: 'Plataforma de servicios contables y tributarios para MYPES',
      status: 'Sistema funcionando correctamente ✅',
      database: {
        totalPages: pages.length,
        pages: pages.map(p => ({
          slug: p.pageSlug,
          name: p.pageName,
          published: p.isPublished,
          lastUpdate: p.lastUpdated,
          updatedBy: p.updatedBy
        }))
      },
      currentPage: homePage ? {
        name: homePage.pageName,
        lastUpdate: homePage.lastUpdated,
        updatedBy: homePage.updatedBy,
        status: homePage.isPublished ? 'Publicada ✅' : 'Borrador 📝'
      } : null,
      tecnologias: {
        backend: 'Node.js + Express + MongoDB',
        frontend: 'React + TypeScript + Vite',
        database: 'MongoDB con auto-inicialización',
        auth: 'Clerk Authentication'
      },
      features: [
        'Auto-inicialización de base de datos',
        'Sistema de monitoreo integrado',
        'CMS Manager para edición',
        'Logging detallado',
        'Health checks automáticos'
      ],
      timestamp: new Date().toISOString()
    };

    logger.api('GET', '/api/project-info', 200, Date.now() - startTime);
    
    res.json({
      success: true,
      data: projectInfo
    });
  } catch (error) {
    logger.error('Error al obtener información del proyecto', error);
    logger.api('GET', '/api/project-info', 500, Date.now() - startTime);
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del proyecto',
      error: error.message
    });
  }
});

// ========================================
// 🛡️ RUTAS CON RATE LIMITING ESPECÍFICO
// ========================================

// Rutas públicas con rate limiting general
app.use('/api/servicios', generalLimiter, serviciosRoutes);
app.use('/api/paquetes', generalLimiter, paquetesRoutes);
app.use('/api/categorias', generalLimiter, categoriasRoutes); // 📁 Categorías Routes
app.use('/api/blog', generalLimiter, blogRoutes); // 📝 Blog Routes (Sprint 1)

// Rutas de contacto con rate limiting ESTRICTO (previene spam)
app.use('/api/contact', contactLimiter, contactRoutes); // 📧 Contact Routes (público + admin)

// Rutas de autenticación/usuarios con rate limiting anti-brute-force
app.use('/api/users', authLimiter, usersRoutes);
app.use('/api/admin', authLimiter, adminRoutes);
app.use('/api/profile', authLimiter, profileRoutes); // 👤 Profile Routes (Social System)
app.use('/api/notifications', authLimiter, notificationsRoutes); // 🔔 Notifications Routes

// Rutas de AI con rate limiting específico (costosas en recursos)
app.use('/api/agents', aiChatLimiter, agentsRoutes); // 🤖 AI Agents System Routes
app.use('/api/gerente', aiChatLimiter, gerenteRoutes); // 👔 Gerente General Routes (Coordinator)
app.use('/api/ai', aiChatLimiter, aiAnalyticsRoutes); // 📊 AI Analytics & Tracking Routes
app.use('/api/agents/testing', aiChatLimiter, agentTestingRoutes); // 🧪 Advanced AI Testing Suite
app.use('/api/agents/agenda', aiChatLimiter, agentAgendaRoutes); // 📅 Agenda for Agents (GerenteGeneral)
app.use('/api/agents/blog/session', aiChatLimiter, agentsBlogSessionRoutes); // 💬 Blog Conversational Sessions

// Rutas protegidas con rate limiting general
app.use('/api/cms', generalLimiter, cmsRoutes);
app.use('/api/upload', generalLimiter, uploadRoutes);
app.use('/api/demo', generalLimiter, demoRoutes);
app.use('/api/crm', generalLimiter, crmRoutes); // 💼 CRM Routes
app.use('/api/client', generalLimiter, clientRoutes); // 🎉 Client Onboarding Routes
app.use('/api', commentsRoutes); // 💬 Comments & Moderation Routes (Sprint 4)
app.use('/api/user-blog', generalLimiter, userBlogRoutes); // 📚 User Blog Activity Routes (Dashboard)
app.use('/api/events', generalLimiter, eventRoutes); // 📅 Events/Agenda System Routes
app.use('/api/seo-monitor', generalLimiter, seoMonitorRoutes); // 📊 SEO Monitoring System
app.use('/api/direct-messages', generalLimiter, directMessagesRoutes); // 📧 Direct Messages to Users

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path 
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message
  });
});

// ========================================
// 🚀 INICIO DEL SERVIDOR
// ========================================
let server;

async function startServer() {
  try {
    // 1. Primero inicializar todo (DB, agentes, etc.)
    await initializeServer();
    
    // 2. Solo después de inicializar, empezar a escuchar
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.startup(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      logger.startup(`API available at: http://localhost:${PORT}/api`);
      logger.startup(`Health check: http://localhost:${PORT}/health`);
      logger.success('✅ THADO Consulting Backend Server iniciado y listo para recibir tráfico');
    });
    
    // 3. Configurar timeout del servidor (importante para Render)
    server.keepAliveTimeout = 65000; // Ligeramente mayor que el de Cloudflare (60s)
    server.headersTimeout = 66000; // Ligeramente mayor que keepAliveTimeout
    
  } catch (error) {
    logger.error('💥 Error fatal al iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar el servidor
startServer();

// ========================================
// 🛡️ GRACEFUL SHUTDOWN MEJORADO PARA RENDER
// ========================================
const gracefulShutdown = async (signal) => {
  // Evitar múltiples llamadas
  if (isShuttingDown) {
    console.log(`⚠️ ${signal} received but shutdown already in progress`);
    return;
  }
  
  isShuttingDown = true;
  console.log(`\n📡 ${signal} received: iniciando cierre gracioso del servidor...`);
  logger.warn(`Graceful shutdown iniciado por: ${signal}`);
  
  // 1. Dejar de aceptar nuevas conexiones
  server.close(() => {
    console.log('✓ HTTP server cerrado - no acepta nuevas conexiones');
  });
  
  // 2. Timeout de seguridad (Render espera hasta 30s, usamos 25s)
  const forceShutdownTimeout = setTimeout(() => {
    console.error('⚠️ Forzando cierre después de timeout (25s)');
    process.exit(1);
  }, 25000);
  
  try {
    // 3. Esperar un momento para que requests en curso terminen
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Cerrar conexión a MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close(false);
      console.log('✓ Conexión a MongoDB cerrada correctamente');
    }
    
    // 5. Cerrar otras conexiones (Redis, etc.) cuando se implementen
    // TODO: Agregar cierre de Redis cuando se implemente
    // if (redis && redis.status === 'ready') {
    //   await redis.quit();
    //   console.log('✓ Conexión a Redis cerrada correctamente');
    // }
    
    // 6. Limpiar timeout y salir limpiamente
    clearTimeout(forceShutdownTimeout);
    console.log('✅ Graceful shutdown completado exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error durante graceful shutdown:', error);
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
};

// Manejar señales de terminación
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});
