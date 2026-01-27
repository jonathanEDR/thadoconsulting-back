/**
 * Script de migración automática del BlogAgent
 * 
 * Este script realiza la migración de forma segura:
 * 1. Crea backups de seguridad
 * 2. Renombra el archivo refactorizado
 * 3. Verifica la integridad
 * 4. Proporciona rollback en caso de error
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function step(number, message) {
  log(`\n[Paso ${number}] ${message}`, 'cyan');
}

async function migrate() {
  log('\n╔═══════════════════════════════════════════════════════╗', 'blue');
  log('║   🔄 MIGRACIÓN DEL BLOGAGENT - VERSIÓN REFACTORIZADA   ║', 'blue');
  log('╚═══════════════════════════════════════════════════════╝', 'blue');

  const agentsDir = path.join(__dirname);
  const originalFile = path.join(agentsDir, 'BlogAgent.js');
  const refactoredFile = path.join(agentsDir, 'BlogAgent.refactored.js');
  const backupFile = path.join(agentsDir, 'BlogAgent.backup.js');
  const oldFile = path.join(agentsDir, 'BlogAgent.old.js');

  try {
    // Paso 1: Verificar que los archivos existen
    step(1, 'Verificando archivos...');
    
    if (!fs.existsSync(originalFile)) {
      throw new Error(`❌ Archivo original no encontrado: ${originalFile}`);
    }
    
    if (!fs.existsSync(refactoredFile)) {
      throw new Error(`❌ Archivo refactorizado no encontrado: ${refactoredFile}`);
    }
    
    log('✅ Archivos encontrados correctamente', 'green');

    // Paso 2: Crear backup de seguridad
    step(2, 'Creando backup de seguridad...');
    
    fs.copyFileSync(originalFile, backupFile);
    log(`✅ Backup creado: ${backupFile}`, 'green');

    // Paso 3: Verificar servicios
    step(3, 'Verificando servicios especializados...');
    
    const servicesDir = path.join(__dirname, '../services/blog');
    const requiredServices = [
      'BlogContentService.js',
      'BlogSEOService.js',
      'BlogAnalysisService.js',
      'BlogPatternService.js',
      'BlogChatService.js'
    ];

    let allServicesExist = true;
    for (const service of requiredServices) {
      const servicePath = path.join(servicesDir, service);
      if (!fs.existsSync(servicePath)) {
        log(`❌ Servicio no encontrado: ${service}`, 'red');
        allServicesExist = false;
      } else {
        log(`✅ ${service}`, 'green');
      }
    }

    if (!allServicesExist) {
      throw new Error('❌ No se encontraron todos los servicios necesarios');
    }

    // Paso 4: Renombrar archivos
    step(4, 'Realizando migración...');
    
    // Renombrar original a .old
    fs.renameSync(originalFile, oldFile);
    log(`✅ Archivo original renombrado: BlogAgent.old.js`, 'green');
    
    // Renombrar refactorizado a principal
    fs.renameSync(refactoredFile, originalFile);
    log(`✅ Archivo refactorizado activado: BlogAgent.js`, 'green');

    // Paso 5: Verificar migración
    step(5, 'Verificando migración...');
    
    const newContent = fs.readFileSync(originalFile, 'utf8');
    
    if (newContent.includes('REFACTORIZADO')) {
      log('✅ Migración completada correctamente', 'green');
    } else {
      throw new Error('❌ El archivo migrado no es la versión refactorizada');
    }

    // Paso 6: Instrucciones finales
    step(6, 'Siguientes pasos');
    
    log('\n📋 MIGRACIÓN COMPLETADA EXITOSAMENTE\n', 'green');
    log('Archivos creados:');
    log('  ✓ BlogAgent.js         → Nueva versión activa (refactorizada)', 'green');
    log('  ✓ BlogAgent.old.js     → Versión original (respaldo temporal)', 'yellow');
    log('  ✓ BlogAgent.backup.js  → Backup de seguridad', 'yellow');
    log('\n⚠️  IMPORTANTE:', 'yellow');
    log('  1. Reinicia el servidor: npm start', 'cyan');
    log('  2. Prueba los endpoints del BlogAgent', 'cyan');
    log('  3. Si todo funciona, elimina los archivos .old y .backup', 'cyan');
    log('  4. Si hay problemas, ejecuta: npm run rollback:blogagent', 'cyan');
    
    log('\n📝 Para rollback manual:', 'yellow');
    log(`  mv ${oldFile} ${originalFile}`, 'cyan');
    
    log('\n🎉 ¡Listo! El BlogAgent ha sido refactorizado exitosamente.\n', 'green');

  } catch (error) {
    log('\n❌ ERROR EN LA MIGRACIÓN:', 'red');
    log(error.message, 'red');
    
    // Intentar rollback automático
    log('\n🔄 Intentando rollback automático...', 'yellow');
    
    try {
      if (fs.existsSync(backupFile)) {
        if (fs.existsSync(originalFile)) {
          fs.unlinkSync(originalFile);
        }
        fs.copyFileSync(backupFile, originalFile);
        log('✅ Rollback exitoso - archivo original restaurado', 'green');
      }
    } catch (rollbackError) {
      log('❌ Error en rollback automático:', 'red');
      log(rollbackError.message, 'red');
      log('\n⚠️  ROLLBACK MANUAL REQUERIDO:', 'red');
      log(`  cp ${backupFile} ${originalFile}`, 'cyan');
    }
    
    process.exit(1);
  }
}

async function rollback() {
  log('\n╔═══════════════════════════════════════════════════════╗', 'yellow');
  log('║      🔙 ROLLBACK DEL BLOGAGENT - VERSIÓN ORIGINAL      ║', 'yellow');
  log('╚═══════════════════════════════════════════════════════╝', 'yellow');

  const agentsDir = path.join(__dirname);
  const originalFile = path.join(agentsDir, 'BlogAgent.js');
  const oldFile = path.join(agentsDir, 'BlogAgent.old.js');
  const backupFile = path.join(agentsDir, 'BlogAgent.backup.js');
  const refactoredBackupFile = path.join(agentsDir, 'BlogAgent.refactored.backup.js');

  try {
    step(1, 'Verificando archivos de rollback...');
    
    if (!fs.existsSync(oldFile) && !fs.existsSync(backupFile)) {
      throw new Error('❌ No se encontraron archivos para rollback');
    }

    step(2, 'Realizando rollback...');
    
    // Backup de la versión refactorizada actual
    if (fs.existsSync(originalFile)) {
      fs.copyFileSync(originalFile, refactoredBackupFile);
      log('✅ Backup de versión refactorizada creado', 'green');
    }

    // Restaurar desde .old o .backup
    let sourceFile = fs.existsSync(oldFile) ? oldFile : backupFile;
    fs.copyFileSync(sourceFile, originalFile);
    
    log(`✅ Archivo original restaurado desde ${path.basename(sourceFile)}`, 'green');

    step(3, 'Verificando rollback...');
    
    const restoredContent = fs.readFileSync(originalFile, 'utf8');
    
    if (!restoredContent.includes('REFACTORIZADO')) {
      log('✅ Rollback completado correctamente', 'green');
    } else {
      throw new Error('❌ El archivo restaurado no es la versión original');
    }

    log('\n✅ ROLLBACK COMPLETADO', 'green');
    log('\n⚠️  IMPORTANTE:', 'yellow');
    log('  1. Reinicia el servidor: npm start', 'cyan');
    log('  2. Verifica que todo funciona correctamente', 'cyan');
    log('\nArchivos de backup disponibles:', 'yellow');
    log(`  - ${refactoredBackupFile} (versión refactorizada)`, 'cyan');
    
  } catch (error) {
    log('\n❌ ERROR EN ROLLBACK:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Ejecutar según comando
const command = process.argv[2];

if (command === 'rollback') {
  rollback();
} else {
  migrate();
}
