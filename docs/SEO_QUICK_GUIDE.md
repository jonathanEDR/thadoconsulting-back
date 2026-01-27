# 🎯 Sistema de SEO con Prioridad Triple - Guía Rápida

## 📊 Cómo Funciona

```
Usuario accede → Página carga → Hook useSeo() ejecuta:

┌─────────────────────────────────────────────┐
│ 1️⃣ ¿Hay datos en CMS (MongoDB)?            │
│    ✅ SÍ → USA DATOS DEL CMS                │  ← TÚ EDITAS AQUÍ
│    ❌ NO → Sigue al paso 2                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2️⃣ ¿Hay config en seoConfig.ts?            │
│    ✅ SÍ → USA CONFIG HARDCODEADA           │  ← Defaults profesionales
│    ❌ NO → Sigue al paso 3                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3️⃣ USA FALLBACK GENÉRICO                   │  ← Último recurso
└─────────────────────────────────────────────┘
```

## 🔍 Ver de Dónde Vienen los Datos

Abre **DevTools Console** en modo desarrollo:

### ✅ Caso 1: Datos del CMS (LO IDEAL)
```
✅ [useSeo] "blog" - Origen: CMS (Database)
   Title: Blog SCUTI Company - Noticias Tecnológicas
   Description: Mantente informado con las últimas noticias...
```
**Significa:** Los datos vienen del panel CMS. ¡Perfecto! 🎉

### ⚙️ Caso 2: Configuración Hardcodeada
```
⚙️ [useSeo] "blog" - Origen: HARDCODED (seoConfig.ts)
   Razón: CMS no disponible o sin datos
```
**Significa:** No hay datos en el CMS, usa configuración hardcodeada de `seoConfig.ts`

### ⚠️ Caso 3: Fallback Genérico
```
⚠️ [useSeo] "blog" - Origen: FALLBACK
   Razón: Sin CMS ni configuración hardcodeada
```
**Significa:** No hay CMS ni hardcoded. Usando valores genéricos (¡agregar a seoConfig.ts!)

## 📝 Cómo Editar SEO

### Opción 1: Panel CMS (RECOMENDADO) 🏆

```
1. Ir a → /cms-manager
2. Seleccionar página → Blog / Servicios / Nosotros
3. Ir a sección → SEO
4. Editar campos:
   - Meta Title
   - Meta Description
   - Keywords
   - OG Title, OG Description, OG Image
5. Guardar
```

**Resultado:** ✅ Prioridad MÁXIMA. Se aplica inmediatamente.

### Opción 2: Editar Hardcoded (Para defaults)

**Archivo:** `frontend/src/config/seoConfig.ts`

```typescript
export const DEFAULT_SEO_CONFIG = {
  blog: {
    metaTitle: 'Tu título aquí',
    metaDescription: 'Tu descripción',
    keywords: ['palabra1', 'palabra2'],
    ogTitle: 'Título para redes sociales',
    ogImage: 'https://tu-imagen.jpg'
  }
};
```

**Cuándo usar:** 
- Definir SEO por defecto profesional
- Testing sin acceso al CMS
- Recuperación ante fallos

## 🎨 Páginas Configuradas

| Página | pageName | ¿Hardcoded? | ¿En CMS? | Notas |
|--------|----------|-------------|----------|-------|
| ~~Home~~ | ~~`home`~~ | ❌ | ✅ | ⚠️ Sistema propio (no usar hook) |
| Blog | `blog` | ✅ | ✅ | Usa sistema de prioridad |
| Servicios | `services` / `servicios` | ✅ | ✅ | Usa sistema de prioridad |
| Nosotros | `about` / `nosotros` | ✅ | ✅ | Usa sistema de prioridad |
| Contacto | `contact` / `contacto` | ✅ | ✅ | Usa sistema de prioridad |

**⚠️ IMPORTANTE:** Home tiene su propio sistema de SEO (no toca).

## 🚨 Troubleshooting Rápido

### Problema: "Mis cambios del CMS no se aplican"

**Soluciones:**
1. ✅ Hard refresh: `Ctrl + Shift + R`
2. ✅ Verificar en MongoDB que se guardó
3. ✅ Ver logs en consola (DevTools)
4. ✅ Verificar que el `pageSlug` coincide

### Problema: "Quiero cambiar el SEO hardcoded"

**Solución:**
Editar: `frontend/src/config/seoConfig.ts`

### Problema: "¿Cómo agrego una nueva página?"

**Pasos:**
1. Agregar a `seoConfig.ts` con su configuración
2. Agregar a `CMS_PAGES` en `useSeo.tsx`
3. Usar hook: `useSeo({ pageName: 'mi-pagina' })`

## 📂 Archivos Clave

```
frontend/
├── src/
│   ├── config/
│   │   └── seoConfig.ts ← Configuración hardcodeada (Defaults)
│   ├── hooks/
│   │   └── useSeo.tsx ← Hook con sistema de prioridad
│   └── pages/
│       └── public/
│           ├── blog/BlogHome.tsx ← Usa useSeo()
│           ├── About.tsx ← Usa useSeo()
│           └── ServicesPublicV2.tsx ← Usa useSeo()

backend/
├── models/
│   └── Page.js ← Modelo con esquema SEO (MongoDB)
└── docs/
    └── SOLUCION_SEO_INDEPENDIENTE.md ← Documentación completa
```

## ✨ Ventajas del Sistema

| Ventaja | Descripción |
|---------|-------------|
| 🔒 Sin downtime | Si CMS falla, usa hardcoded |
| 🎯 Transparencia | Logs indican origen de datos |
| ⚡ Actualización instantánea | Cambios del CMS en tiempo real |
| 🎨 SEO profesional | Defaults optimizados siempre |
| 🐛 Fácil debugging | Sabes exactamente qué está pasando |

## 🎯 Comandos Rápidos

### Ver logs en producción (si necesitas)
```javascript
// En consola del navegador
localStorage.setItem('DEBUG_SEO', 'true');
location.reload();
```

### Forzar recarga del CMS
```javascript
window.dispatchEvent(new Event('clearCache'));
```

### Ver datos SEO actuales
```javascript
// En consola del navegador
document.querySelector('meta[name="description"]').content
document.title
```

---

## 🚀 Quick Start

**Para empezar a usar:**

1. **Ver de dónde vienen tus datos actuales**
   - Abre DevTools Console
   - Recarga la página
   - Busca logs `[useSeo]`

2. **Configurar SEO único para cada página**
   - Ve a `/cms-manager`
   - Edita cada página
   - Los cambios se aplican inmediatamente

3. **¿Sin acceso al CMS?**
   - Edita `seoConfig.ts`
   - Agrega/modifica configuraciones
   - Reinicia dev server

---

**¿Necesitas ayuda?** → Ver documentación completa en `backend/docs/SOLUCION_SEO_INDEPENDIENTE.md`
