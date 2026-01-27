# 🏠 Sistema SEO de la Página Home - Documentación

## ⚠️ IMPORTANTE: NO MODIFICAR

La página **Home** tiene su **propio sistema de SEO** que **funciona perfectamente** y es diferente al resto de páginas.

## 🎯 ¿Por qué Home es diferente?

Home.tsx NO usa el hook `useSeo()` porque tiene un sistema más complejo y personalizado que incluye:
- ✅ Carga directa desde CMS con `getPageBySlug('home')`
- ✅ Gestión manual de React Helmet
- ✅ Fallbacks propios en el código
- ✅ Schema.org con `<HomePageSchema />`
- ✅ Actualización en tiempo real con eventos

## 📂 Ubicación del Código

**Archivo:** `frontend/src/pages/public/Home.tsx`

### Sistema Actual (FUNCIONA PERFECTO ✅)

```tsx
// Home.tsx - Líneas 265-285
const loadPageData = async (forceRefresh = false) => {
  const data = forceRefresh 
    ? await forceReload('home')
    : await getPageBySlug('home');

  if (data && data.content) {
    setPageData(data);
    
    // Actualiza el título directamente
    if (data.seo?.metaTitle) {
      document.title = data.seo.metaTitle;
    }
  }
};

// Home.tsx - Líneas 299-321
<Helmet>
  <title>
    {pageData.seo?.metaTitle || 'SCUTI Company - Transformamos tu empresa...'}
  </title>
  <meta 
    name="description" 
    content={pageData.seo?.metaDescription || 'Soluciones digitales...'} 
  />
  <meta name="keywords" content={(pageData.seo?.keywords || []).join(', ')} />
  
  {/* Open Graph */}
  <meta property="og:title" content={pageData.seo?.ogTitle || ...} />
  <meta property="og:description" content={pageData.seo?.ogDescription || ...} />
  {pageData.seo?.ogImage && <meta property="og:image" content={...} />}
  
  {/* Twitter Card */}
  <meta name="twitter:card" content="summary_large_image" />
  {/* ... más metadatos */}
</Helmet>

{/* Schema.org separado */}
<HomePageSchema />
```

## 🎨 Valores por Defecto de Home

```typescript
// Definidos directamente en Home.tsx (líneas 171-172)
const DEFAULT_SEO = {
  metaTitle: 'Scuti Company - Transformamos tu empresa con tecnología inteligente',
  metaDescription: 'Soluciones digitales, desarrollo de software y modelos de IA personalizados para impulsar tu negocio.',
  keywords: [],
  ogTitle: 'SCUTI Company',
  ogDescription: 'Transformamos empresas con tecnología',
  ogImage: ''
};
```

## 🔄 Flujo de Carga SEO en Home

```
1. Componente Home se monta
   ↓
2. useEffect ejecuta loadPageData()
   ↓
3. Carga datos del CMS: getPageBySlug('home')
   ↓
4. ¿Hay datos SEO en CMS?
   ├─ SÍ → Usa pageData.seo.metaTitle, etc.
   └─ NO → Usa fallbacks hardcodeados en el JSX
   ↓
5. React Helmet renderiza los meta tags
   ↓
6. HomePageSchema agrega JSON-LD
```

## ⚙️ Editar SEO de Home

### ✅ Opción 1: Panel CMS (Recomendado)
```
1. Ir a /cms-manager
2. Seleccionar página "Home" o "home"
3. Editar sección SEO
4. Guardar
```

### ✅ Opción 2: Editar Fallbacks (Si necesitas cambiar defaults)

**Archivo:** `frontend/src/pages/public/Home.tsx`

```tsx
// Buscar líneas 300-316 y editar los fallbacks:
<Helmet>
  <title>
    {pageData.seo?.metaTitle || 'TU NUEVO TÍTULO AQUÍ'}
  </title>
  <meta 
    name="description" 
    content={pageData.seo?.metaDescription || 'TU NUEVA DESCRIPCIÓN'} 
  />
  {/* ... */}
</Helmet>
```

## 🚫 NO Hacer

❌ **NO agregar Home a `seoConfig.ts`** - No se usará
❌ **NO agregar 'home' a `CMS_PAGES` en useSeo.tsx** - Causará conflictos
❌ **NO usar hook useSeo() en Home.tsx** - Ya tiene su sistema
❌ **NO modificar el sistema actual** - Funciona perfectamente

## ✅ Sí Hacer

✅ Editar SEO desde el panel CMS
✅ Dejar el código de Home.tsx como está
✅ Usar el hook useSeo() solo para otras páginas (Blog, Services, About)

## 📊 Comparación: Home vs Otras Páginas

| Característica | Home | Blog/Services/About |
|---------------|------|---------------------|
| **Hook usado** | Ninguno (manual) | `useSeo()` |
| **Carga CMS** | `getPageBySlug('home')` directo | A través de useSeo() |
| **Fallbacks** | En JSX del componente | En `seoConfig.ts` |
| **Schema.org** | `<HomePageSchema />` | En Helmet |
| **Sistema de prioridad** | CMS → Fallbacks JSX | CMS → seoConfig → Fallbacks |

## 🔍 Verificar que Home Funciona

Abre DevTools Console y deberías ver:

```javascript
// Home NO muestra logs [useSeo] porque no usa el hook
// En su lugar, carga datos directamente del CMS
```

Para verificar el SEO de Home:

```javascript
// En consola del navegador:
document.title  // Debe mostrar el título de Home
document.querySelector('meta[name="description"]').content
document.querySelector('meta[property="og:title"]').content
```

## 📝 Resumen

- **Home tiene su propio sistema** ← No tocar ✅
- **Otras páginas usan useSeo()** ← Usar sistema nuevo ✅
- **No mezclar los dos sistemas** ← Evita conflictos ✅

## 🔗 Referencias

- **Código Home:** `frontend/src/pages/public/Home.tsx`
- **Hook useSeo:** `frontend/src/hooks/useSeo.tsx` (NO usado por Home)
- **Config SEO:** `frontend/src/config/seoConfig.ts` (NO incluye Home)
- **Schema Home:** `frontend/src/components/seo/SchemaOrg.tsx`

---

**Última actualización:** Diciembre 2025  
**Estado:** ✅ Funciona perfectamente - NO modificar
