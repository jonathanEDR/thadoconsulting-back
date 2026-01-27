# 🔍 DIAGNÓSTICO COMPLETO: Problema de Autenticación Clerk

## ✅ Estado Actual

### Problemas Resueltos
1. ✅ Error E11000 duplicate key → Corregido en userController.js
2. ✅ Rate limiting 429 → Ajustado de 5 a 10 intentos
3. ✅ Llamadas duplicadas → Eliminado hook useUserSync duplicado

### Problema Actual
❌ **"Token inválido de Clerk"** - Múltiples advertencias en el backend

## 🔬 Análisis del Problema

### Configuración Detectada

**Backend** (`backend/.env`):
```
CLERK_SECRET_KEY=sk_live_Up0nGNJ... ✅ Producción
```

**Frontend** (`frontend/.env`):
```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuc2N1dGljb21wYW55LmNvbSQ ✅ Producción
```

### ⚠️ Posible Causa Raíz

Las claves son de producción (`sk_live_` y `pk_live_`), pero pueden ser de **aplicaciones diferentes de Clerk**.

## 🛠️ SOLUCIÓN INMEDIATA

### Opción 1: Usar Claves de Desarrollo (Recomendado para desarrollo local)

1. **Ve a Clerk Dashboard**: https://dashboard.clerk.com
2. **Selecciona tu aplicación** (o crea una nueva para desarrollo)
3. **Ve a "API Keys"**
4. **Copia las claves de DESARROLLO**:
   - Publishable key (empieza con `pk_test_`)
   - Secret key (empieza con `sk_test_`)

5. **Actualiza `backend/.env`**:
   ```env
   CLERK_SECRET_KEY=sk_test_TuClaveDeDesarrollo
   ```

6. **Actualiza `frontend/.env`**:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_TuClaveDeDesarrollo
   ```

### Opción 2: Verificar que las claves de producción sean de la misma app

1. **Ve a Clerk Dashboard**: https://dashboard.clerk.com
2. **Verifica que ambas claves** (pk_live_ y sk_live_) **sean de la MISMA aplicación**
3. **En "API Keys"**, verifica que:
   - El `Publishable key` coincida con el del frontend
   - El `Secret key` coincida con el del backend

## 🔍 Verificación de la Solución

Después de actualizar las claves:

1. **Reinicia el backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Reinicia el frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Prueba el login** y verifica que:
   - ✅ No aparezcan errores "Token inválido de Clerk"
   - ✅ El dashboard cargue correctamente
   - ✅ Los roles se identifiquen correctamente

## 🎯 Configuración Recomendada para Desarrollo

```env
# backend/.env
NODE_ENV=development
CLERK_SECRET_KEY=sk_test_XXXXX  # Clave de desarrollo
```

```env
# frontend/.env
VITE_API_URL=http://localhost:5000/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_XXXXX  # Clave de desarrollo
```

## ⚙️ Configuración de Clerk Dashboard

Asegúrate de configurar en tu aplicación de Clerk:

1. **Allowed redirect URLs** (Development):
   - `http://localhost:5173`
   - `http://localhost:5173/*`

2. **Session token template** (opcional pero recomendado):
   - Ve a "Sessions" > "Customize session token"
   - Añade claims personalizados si es necesario

## 📊 Logs Esperados Después de la Corrección

**Backend (correcto)**:
```
✅ [SUCCESS] Usuario existente encontrado, actualizando datos
✅ [API] POST /api/users/sync - Status: 200
```

**Backend (sin warnings)**:
```
❌ NO debería aparecer: "⚠️ Token inválido de Clerk"
```

## 🆘 Si el Problema Persiste

1. **Limpia la sesión de Clerk en el navegador**:
   - Abre DevTools > Application > Storage
   - Elimina todo bajo "clerk.XXXXX.session"
   - Elimina cookies de Clerk
   - Vuelve a hacer login

2. **Verifica que Clerk esté configurado correctamente**:
   ```bash
   node scripts/testClerkAuth.js
   ```

3. **Captura un token para debugging**:
   - Abre DevTools > Console
   - Ejecuta: `await window.Clerk.session.getToken()`
   - Copia el token
   - Ejecuta: `TOKEN="token-aqui" node scripts/testClerkAuth.js`

---

**Última actualización**: 26 de Enero, 2026  
**Estado**: Diagnóstico completado, pendiente actualización de claves
