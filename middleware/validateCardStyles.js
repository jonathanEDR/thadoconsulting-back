/**
 * 🛡️ Middleware de Validación de Contraste para Estilos de Tarjetas
 * 
 * Previene guardar configuraciones con contraste insuficiente
 * Auto-corrige valores problemáticos antes de guardar en la BD
 */

/**
 * Convierte color a RGB
 */
function parseColor(color) {
  // Hex format (#RRGGBB)
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substr(0, 2), 16),
        g: parseInt(hex.substr(2, 2), 16),
        b: parseInt(hex.substr(4, 2), 16)
      };
    }
  }
  
  // RGBA format
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3])
    };
  }
  
  return null;
}

/**
 * Calcula luminancia relativa según WCAG
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calcula ratio de contraste entre dos colores
 */
function getContrastRatio(color1, color2) {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  
  if (!c1 || !c2) return 0;
  
  const l1 = getLuminance(c1.r, c1.g, c1.b);
  const l2 = getLuminance(c2.r, c2.g, c2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Auto-corrige estilos con contraste insuficiente
 */
function autoCorrectCardStyles(styles, theme) {
  const corrected = { ...styles };
  const changes = [];
  
  // Valores seguros por tema
  const safeColors = {
    light: {
      background: 'rgba(255, 255, 255, 0.9)',
      titleColor: '#1F2937',
      descriptionColor: '#4B5563',
      linkColor: '#3462af'
    },
    dark: {
      background: 'rgba(17, 24, 39, 0.9)',
      titleColor: '#FFFFFF',
      descriptionColor: '#D1D5DB',
      linkColor: '#3462af'
    }
  };
  
  const safe = safeColors[theme];
  const background = styles.background || safe.background;
  
  // Validar cada color de texto
  const titleContrast = getContrastRatio(styles.titleColor || safe.titleColor, background);
  const descContrast = getContrastRatio(styles.descriptionColor || safe.descriptionColor, background);
  const linkContrast = getContrastRatio(styles.linkColor || safe.linkColor, background);
  
  // Corregir si el contraste es insuficiente (< 3:1)
  if (titleContrast < 3) {
    corrected.titleColor = safe.titleColor;
    changes.push(`titleColor: ${styles.titleColor} → ${safe.titleColor} (contraste: ${titleContrast.toFixed(2)}:1)`);
  }
  
  if (descContrast < 3) {
    corrected.descriptionColor = safe.descriptionColor;
    changes.push(`descriptionColor: ${styles.descriptionColor} → ${safe.descriptionColor} (contraste: ${descContrast.toFixed(2)}:1)`);
  }
  
  if (linkContrast < 3) {
    corrected.linkColor = safe.linkColor;
    changes.push(`linkColor: ${styles.linkColor} → ${safe.linkColor} (contraste: ${linkContrast.toFixed(2)}:1)`);
  }
  
  // Corregir background si no coincide con el tema
  if (theme === 'dark' && background.includes('255, 255, 255')) {
    corrected.background = safe.background;
    changes.push(`background: fondo claro en tema oscuro → ${safe.background}`);
  } else if (theme === 'light' && (background.includes('17, 24, 39') || background.includes('0, 0, 0'))) {
    corrected.background = safe.background;
    changes.push(`background: fondo oscuro en tema claro → ${safe.background}`);
  }
  
  return {
    wasCorrected: changes.length > 0,
    original: styles,
    corrected,
    changes
  };
}

/**
 * Middleware para validar y auto-corregir estilos de tarjetas
 */
export const validateCardStylesMiddleware = (req, res, next) => {
  try {
    // DESACTIVADO TEMPORALMENTE: Auto-corrección interfiere con cambios del usuario
    return next();
    
    // Solo validar en actualizaciones de contenido
    if (req.method !== 'PUT' && req.method !== 'POST') {
      return next();
    }
    
    const body = req.body;
    
    // Verificar si hay actualizaciones de cardsDesign
    const hasValueAddedCardsDesign = 
      body.content?.valueAdded?.cardsDesign ||
      body['content.valueAdded.cardsDesign.light'] ||
      body['content.valueAdded.cardsDesign.dark'];
      
    const hasSolutionsCardsDesign = 
      body.content?.solutions?.cardsDesign ||
      body['content.solutions.cardsDesign.light'] ||
      body['content.solutions.cardsDesign.dark'];
      
    const hasContactFormCardsDesign = 
      body.content?.contactForm?.cardsDesign ||
      body['content.contactForm.cardsDesign.light'] ||
      body['content.contactForm.cardsDesign.dark'];
    
    if (!hasValueAddedCardsDesign && !hasSolutionsCardsDesign && !hasContactFormCardsDesign) {
      return next();
    }
    
    let correctionsMade = false;
    const correctionLog = [];
    
    // Validar Value Added
    if (body.content?.valueAdded?.cardsDesign) {
      const { light, dark } = body.content.valueAdded.cardsDesign;
      
      if (light) {
        const lightResult = autoCorrectCardStyles(light, 'light');
        if (lightResult.wasCorrected) {
          body.content.valueAdded.cardsDesign.light = lightResult.corrected;
          correctionsMade = true;
          correctionLog.push({
            section: 'Value Added - Tema Claro',
            changes: lightResult.changes
          });
        }
      }
      
      if (dark) {
        const darkResult = autoCorrectCardStyles(dark, 'dark');
        if (darkResult.wasCorrected) {
          body.content.valueAdded.cardsDesign.dark = darkResult.corrected;
          correctionsMade = true;
          correctionLog.push({
            section: 'Value Added - Tema Oscuro',
            changes: darkResult.changes
          });
        }
      }
    }
    
    // Validar Solutions
    if (body.content?.solutions?.cardsDesign) {
      const { light, dark } = body.content.solutions.cardsDesign;
      
      if (light) {
        const lightResult = autoCorrectCardStyles(light, 'light');
        if (lightResult.wasCorrected) {
          body.content.solutions.cardsDesign.light = lightResult.corrected;
          correctionsMade = true;
          correctionLog.push({
            section: 'Solutions - Tema Claro',
            changes: lightResult.changes
          });
        }
      }
      
      if (dark) {
        const darkResult = autoCorrectCardStyles(dark, 'dark');
        if (darkResult.wasCorrected) {
          body.content.solutions.cardsDesign.dark = darkResult.corrected;
          correctionsMade = true;
          correctionLog.push({
            section: 'Solutions - Tema Oscuro',
            changes: darkResult.changes
          });
        }
      }
    }
    
    // Validar ContactForm
    if (body.content?.contactForm?.cardsDesign) {
      const { light, dark } = body.content.contactForm.cardsDesign;
      
      if (light) {
        const lightResult = autoCorrectCardStyles(light, 'light');
        if (lightResult.wasCorrected) {
          body.content.contactForm.cardsDesign.light = lightResult.corrected;
          correctionsMade = true;
          correctionLog.push({
            section: 'ContactForm - Tema Claro',
            changes: lightResult.changes
          });
        }
      }
      
      if (dark) {
        const darkResult = autoCorrectCardStyles(dark, 'dark');
        if (darkResult.wasCorrected) {
          body.content.contactForm.cardsDesign.dark = darkResult.corrected;
          correctionsMade = true;
          correctionLog.push({
            section: 'ContactForm - Tema Oscuro',
            changes: darkResult.changes
          });
        }
      }
    }
    
    // Logging de correcciones
    if (correctionsMade) {
      console.log('\n🛡️ ═══════════════════════════════════════════════════════');
      console.log('🛡️  AUTO-CORRECCIÓN DE CONTRASTE APLICADA');
      console.log('🛡️ ═══════════════════════════════════════════════════════');
      
      correctionLog.forEach(({ section, changes }) => {
        console.log(`\n📝 ${section}:`);
        changes.forEach(change => console.log(`   ✅ ${change}`));
      });
      
      console.log('\n🛡️ ═══════════════════════════════════════════════════════\n');
      
      // Agregar header de respuesta para que el frontend sepa que hubo correcciones
      res.set('X-Auto-Corrected', 'true');
      // Enviar número de correcciones en lugar del JSON completo (evita caracteres inválidos)
      res.set('X-Auto-Corrections-Count', correctionLog.length.toString());
    }
    
    next();
  } catch (error) {
    console.error('❌ Error en validateCardStylesMiddleware:', error);
    // No bloquear la petición si hay error en la validación
    next();
  }
};

export default validateCardStylesMiddleware;

