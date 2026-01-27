# 🖼️ Guía de Imágenes Open Graph (OG) para SEO

## 📊 Dimensiones Ideales

### ✅ Recomendaciones Oficiales

| Plataforma | Dimensiones | Formato | Tamaño Max |
|------------|-------------|---------|------------|
| **Facebook/LinkedIn** | 1200 x 630px | PNG, JPG | < 1MB |
| **Twitter** | 1200 x 628px | PNG, JPG, GIF | < 5MB |
| **Instagram** | 1080 x 1080px | PNG, JPG | < 1MB |
| **WhatsApp** | 300 x 300px+ | PNG, JPG | < 300KB |

### 🎯 Dimensión Universal (RECOMENDADA)

**1200 x 630px** - Funciona para todas las plataformas

## 📂 Ubicación Actual de Logos

```
frontend/public/
├── FAVICON.png                    ← Actualmente usado en seoConfig.ts
├── favicon-512x512.png           ← 512x512px (cuadrado)
├── favicon-192x192.png
├── LOGO VECTOR VERSION BLANCA.svg
├── LOGO VECTOR VERSION NEGRA.svg
└── logos/
    ├── logo-black.svg
    └── logo-white.svg
```

## ⚠️ Problema Actual

El archivo `FAVICON.png` es muy pequeño (probablemente 48x48px o similar) para usarse como imagen OG.

**Resultado:** Imagen pixelada o pequeña en redes sociales.

## ✅ Solución Recomendada

### Opción 1: Crear Imágenes OG Profesionales (IDEAL)

Crear imágenes específicas con:
- Logo SCUTI centrado
- Fondo atractivo (degradado, patrón)
- Texto opcional identificando la página
- Dimensiones: **1200 x 630px**

```
frontend/public/og-images/
├── og-home.png        (1200x630px)
├── og-blog.png        (1200x630px)
├── og-services.png    (1200x630px)
├── og-about.png       (1200x630px)
└── og-contact.png     (1200x630px)
```

**Luego actualizar seoConfig.ts:**
```typescript
blog: {
  // ...
  ogImage: '/og-images/og-blog.png',
}
```

### Opción 2: Usar Favicon Grande (TEMPORAL)

Si tienes favicon de 512x512px, es mejor que el pequeño:

```typescript
blog: {
  // ...
  ogImage: '/favicon-512x512.png',  // Mejor que FAVICON.png
}
```

**Pros:** Rápido, funciona ahora  
**Contras:** Imagen cuadrada, no ideal para OG (recortada en los lados)

### Opción 3: Configurar desde CMS (FLEXIBLE)

Subir imágenes OG desde el panel CMS:

1. Ir a `/cms-manager`
2. Seleccionar página (Blog, Services, etc.)
3. En sección SEO → **OG Image**
4. Subir imagen 1200x630px
5. Guardar

**Pros:** Editable sin código  
**Contras:** Necesitas crear las imágenes primero

## 🎨 Cómo Crear Imágenes OG

### Herramientas Recomendadas

1. **Canva** (gratis)
   - Plantilla: "Facebook Post" o dimensión custom 1200x630px
   - Agregar logo, texto, fondo

2. **Figma** (gratis)
   - Frame: 1200x630px
   - Diseñar y exportar como PNG

3. **Photoshop/GIMP**
   - Canvas: 1200x630px, 72 DPI
   - Exportar PNG optimizado

### Ejemplo de Diseño

```
┌─────────────────────────────────────────────┐
│                                             │
│         [LOGO SCUTI en el centro]           │
│                                             │
│          Blog de Tecnología                 │
│      Noticias y Tendencias Tech             │
│                                             │
│          scuticompany.com/blog              │
│                                             │
└─────────────────────────────────────────────┘
     1200px x 630px - Fondo con gradiente
```

## 🔧 Actualizar Configuración

### En seoConfig.ts (defaults):

```typescript
// frontend/src/config/seoConfig.ts
export const DEFAULT_SEO_CONFIG = {
  blog: {
    // ...
    ogImage: '/og-images/og-blog.png',  // ✅ Imagen específica
  },
  services: {
    // ...
    ogImage: '/og-images/og-services.png',
  },
  // ...
};
```

### En CMS (prioridad máxima):

1. Panel CMS → Página Blog
2. Sección SEO → OG Image
3. Subir: `og-blog.png` (1200x630px)
4. URL generada: `https://res.cloudinary.com/.../og-blog.png`
5. Guardar

## 📊 Verificar Resultados

### Herramientas de Testing

1. **Facebook Sharing Debugger**
   ```
   https://developers.facebook.com/tools/debug/
   ```
   - Pegar URL de tu página
   - Ver preview de la imagen OG

2. **Twitter Card Validator**
   ```
   https://cards-dev.twitter.com/validator
   ```
   - Validar cómo se ve en Twitter

3. **LinkedIn Post Inspector**
   ```
   https://www.linkedin.com/post-inspector/
   ```
   - Ver preview en LinkedIn

4. **Open Graph Check**
   ```
   https://opengraphcheck.com/
   ```
   - Ver preview en múltiples plataformas

## 💡 Tips Adicionales

### Texto en Imagen OG
- ✅ Fuente legible (mínimo 40px)
- ✅ Alto contraste con el fondo
- ✅ Máximo 2-3 líneas de texto
- ❌ Evitar texto muy pequeño

### Colores
- ✅ Usar colores de marca (azul SCUTI)
- ✅ Degradados sutiles
- ❌ Evitar fondos muy oscuros o muy claros

### Logo
- ✅ Centrado o en esquina superior
- ✅ Tamaño: 20-30% del ancho total
- ✅ Con espacio de respiro alrededor

## 📝 Checklist

- [ ] Crear carpeta `/public/og-images/`
- [ ] Diseñar 5 imágenes OG (1200x630px):
  - [ ] og-blog.png
  - [ ] og-services.png
  - [ ] og-about.png
  - [ ] og-contact.png
  - [ ] og-default.png (genérico)
- [ ] Optimizar peso (< 200KB cada una)
- [ ] Actualizar seoConfig.ts con rutas correctas
- [ ] Subir a CMS (opcional, para edición futura)
- [ ] Validar en Facebook Debugger
- [ ] Validar en Twitter Card Validator

## 🚀 Quick Win (Solución Inmediata)

Si necesitas algo YA mientras creas las imágenes profesionales:

```typescript
// frontend/src/config/seoConfig.ts
export const DEFAULT_SEO_CONFIG = {
  blog: {
    // ...
    ogImage: '/favicon-512x512.png',  // Temporal, mejor que nada
  }
};
```

Pero planea crear las imágenes profesionales pronto.

---

**Estado Actual:** ✅ Usando `/FAVICON.png` (pequeño, no ideal)  
**Próximo Paso:** 🎨 Crear imágenes OG profesionales 1200x630px  
**Prioridad:** 🟡 Media (funciona, pero mejorable)
