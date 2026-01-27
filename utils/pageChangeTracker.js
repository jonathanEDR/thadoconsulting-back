import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const CHANGE_LOG_FILE = path.join(logsDir, 'database-changes.log');

/**
 * Middleware de Mongoose para loguear cambios en Pages
 */
export function setupPageChangeTracking(PageModel) {
  
  // Pre-save hook
  PageModel.schema.pre('save', function(next) {
    const doc = this;
    const timestamp = new Date().toISOString();
    
    if (doc.isNew) {
      const log = {
        timestamp,
        action: 'CREATE',
        pageSlug: doc.pageSlug,
        pageName: doc.pageName,
        updatedBy: doc.updatedBy,
        summary: {
          hasHeroImage: !!(doc.content?.hero?.backgroundImage?.light || doc.content?.hero?.backgroundImage?.dark),
          hasSolutionsImage: !!(doc.content?.solutions?.backgroundImage?.light || doc.content?.solutions?.backgroundImage?.dark),
          itemsCount: doc.content?.solutions?.items?.length || 0,
          itemsWithIcons: doc.content?.solutions?.items?.filter(i => i.iconLight || i.iconDark).length || 0
        }
      };
      
      console.log(`📝 [DB] Creando nueva página: ${doc.pageName}`);
      fs.appendFileSync(CHANGE_LOG_FILE, JSON.stringify(log, null, 2) + '\n' + '='.repeat(80) + '\n');
    } else if (doc.isModified()) {
      const modifiedPaths = doc.modifiedPaths();
      
      const log = {
        timestamp,
        action: 'UPDATE',
        pageSlug: doc.pageSlug,
        pageName: doc.pageName,
        updatedBy: doc.updatedBy,
        modifiedPaths: modifiedPaths,
        changes: {}
      };

      // Detectar cambios específicos en imágenes
      if (modifiedPaths.includes('content.hero.backgroundImage') || 
          modifiedPaths.some(p => p.startsWith('content.hero.backgroundImage'))) {
        log.changes.heroBackgroundImage = {
          light: doc.content?.hero?.backgroundImage?.light || null,
          dark: doc.content?.hero?.backgroundImage?.dark || null
        };
      }

      if (modifiedPaths.includes('content.solutions.backgroundImage') || 
          modifiedPaths.some(p => p.startsWith('content.solutions.backgroundImage'))) {
        log.changes.solutionsBackgroundImage = {
          light: doc.content?.solutions?.backgroundImage?.light || null,
          dark: doc.content?.solutions?.backgroundImage?.dark || null
        };
      }

      // Detectar cambios en items
      if (modifiedPaths.some(p => p.startsWith('content.solutions.items'))) {
        log.changes.solutionsItems = doc.content?.solutions?.items?.map(item => ({
          title: item.title,
          iconLight: item.iconLight || null,
          iconDark: item.iconDark || null,
          icon: item.icon || null
        }));
      }

      // Detectar cambios en theme
      if (modifiedPaths.some(p => p.startsWith('theme'))) {
        log.changes.themeModified = true;
      }

      console.log(`📝 [DB] Actualizando página: ${doc.pageName} - ${modifiedPaths.length} campos modificados`);
      console.log(`   Modified paths:`, modifiedPaths.slice(0, 5).join(', ') + (modifiedPaths.length > 5 ? '...' : ''));
      
      fs.appendFileSync(CHANGE_LOG_FILE, JSON.stringify(log, null, 2) + '\n' + '='.repeat(80) + '\n');
    }
    
    next();
  });

  // Post-save hook
  PageModel.schema.post('save', function(doc, next) {
    console.log(`✅ [DB] Guardado exitoso: ${doc.pageName} (${doc.pageSlug})`);
    next();
  });

  // Pre-update hook (para findOneAndUpdate, updateOne, etc)
  PageModel.schema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    const filter = this.getFilter();
    const timestamp = new Date().toISOString();
    
    const log = {
      timestamp,
      action: 'FINDONEANDUPDATE',
      filter: filter,
      updateFields: Object.keys(update.$set || update),
      updatePreview: {}
    };

    // Registrar cambios en imágenes
    if (update.$set) {
      if (update.$set['content.hero.backgroundImage']) {
        log.updatePreview.heroBackgroundImage = update.$set['content.hero.backgroundImage'];
      }
      if (update.$set['content.solutions.backgroundImage']) {
        log.updatePreview.solutionsBackgroundImage = update.$set['content.solutions.backgroundImage'];
      }
    }

    console.log(`📝 [DB] findOneAndUpdate en Page:`, filter);
    fs.appendFileSync(CHANGE_LOG_FILE, JSON.stringify(log, null, 2) + '\n' + '='.repeat(80) + '\n');
    
    next();
  });

  // Pre-remove hook
  PageModel.schema.pre('remove', function(next) {
    const timestamp = new Date().toISOString();
    const log = {
      timestamp,
      action: 'DELETE',
      pageSlug: this.pageSlug,
      pageName: this.pageName
    };
    
    console.log(`🗑️  [DB] Eliminando página: ${this.pageName}`);
    fs.appendFileSync(CHANGE_LOG_FILE, JSON.stringify(log, null, 2) + '\n' + '='.repeat(80) + '\n');
    
    next();
  });

  console.log('✅ Tracking de cambios en Page configurado');
}

export default setupPageChangeTracking;
