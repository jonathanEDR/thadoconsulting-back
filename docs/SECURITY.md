# 🔒 Documentación de Seguridad - Web Scuti Backend

## Resumen Ejecutivo

Este documento describe todas las mejoras de seguridad implementadas en el backend de Web Scuti para proteger contra ataques de sobrecarga del dashboard, XSS, inyección SQL, y otras vulnerabilidades comunes.

**Fecha de implementación:** Diciembre 2024  
**Tests:** 54 tests automatizados pasando  
**Estado:** ✅ Producción Ready

---

## 📦 Dependencias de Seguridad Instaladas

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `helmet` | ^8.1.0 | Headers HTTP seguros |
| `express-rate-limit` | ^8.1.0 | Rate limiting |
| `express-validator` | ^7.3.1 | Validación de inputs |
| `sanitize-html` | ^2.17.0 | Sanitización HTML |
| `isomorphic-dompurify` | ^2.34.0 | Sanitización DOMPurify |
| `xss` | ^1.0.15 | Filtros XSS adicionales |
| `cookie-parser` | ^1.4.7 | Manejo seguro de cookies |
| `csurf` | ^1.11.0 | Protección CSRF (opcional) |

---

## 🛡️ Capas de Protección

### 1. Rate Limiting (Protección contra DoS/DDoS)

Ubicación: `middleware/securityMiddleware.js`

| Limiter | Límite | Ventana | Rutas Protegidas |
|---------|--------|---------|------------------|
| `generalLimiter` | 100 req | 15 min | Todas las rutas públicas |
| `authLimiter` | 5 req | 15 min | Login, registro, sync |
| `contactLimiter` | 3 req | 1 min | Formulario de contacto |
| `writeLimiter` | 20 req | 5 min | POST/PUT/DELETE |
| `aiChatLimiter` | 5 req | 1 min | Chat IA autenticado |
| `publicChatLimiter` | 3 req | 1 min | Chat IA público |
| `uploadLimiter` | 10 req | 1 hora | Subida de archivos |

**Características:**
- ✅ Siempre activo (incluso en desarrollo)
- ✅ Headers estandarizados (`RateLimit-*`)
- ✅ Mensajes de error amigables
- ✅ Skip para IPs de confianza (configurable)

### 2. Validación de Inputs

Ubicación: `middleware/securityMiddleware.js`

**Validators individuales:**
```javascript
validators.email        // Emails válidos
validators.name         // Nombres sin caracteres peligrosos
validators.phone        // Teléfonos válidos
validators.url          // URLs seguras (no javascript:)
validators.mongoId      // ObjectIds de MongoDB
validators.slug         // Slugs URL-safe
validators.userId       // IDs de Clerk
validators.htmlContent  // HTML seguro
validators.plainText    // Texto plano limpio
validators.command      // Comandos de agentes
validators.sessionId    // IDs de sesión
validators.message      // Mensajes de chat
validators.seoData      // Datos SEO estructurados
validators.paginationQuery  // Parámetros de paginación
```

**Grupos de validación pre-configurados:**
```javascript
validateUserSync        // Sincronización de usuarios Clerk
validateContactCreation // Creación de contactos
validateBlogPost        // Posts del blog
validateImageMetadata   // Subida de imágenes
validateRoleUpdate      // Cambio de roles
validateCmsUpdate       // Actualizaciones CMS
```

### 3. Sanitización de Outputs

Ubicación: `utils/sanitizer.js`

| Función | Uso | Permite |
|---------|-----|---------|
| `sanitizeBlogHtml()` | Posts del blog | Tags HTML seguros, imágenes, videos |
| `sanitizeCmsHtml()` | Páginas CMS | HTML básico, sin scripts |
| `sanitizeComment()` | Comentarios | Solo `<b>`, `<i>`, `<a>` |
| `sanitizePlainText()` | Texto general | Sin HTML |
| `sanitizeName()` | Nombres | Solo letras, espacios, guiones |
| `sanitizeEmail()` | Emails | Formato válido, lowercase |
| `sanitizeUrl()` | URLs | Solo http/https, rutas relativas |
| `sanitizeObject()` | Objetos | Limpia recursivamente |
| `sanitizeBlogPost()` | Post completo | Sanitiza todos los campos |
| `sanitizeUserData()` | Usuarios | Elimina campos sensibles |
| `sanitizeContact()` | Contactos | Limpia datos de formulario |
| `sanitizeCmsPageContent()` | Páginas | Sanitiza contenido CMS |

### 4. Headers HTTP Seguros (Helmet)

```javascript
helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", ...trusted],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", ...trusted],
      // ... más directivas
    }
  },
  crossOriginEmbedderPolicy: false,  // Para iframes
  hsts: { maxAge: 31536000, includeSubDomains: true }
})
```

---

## 🛣️ Rutas Protegidas

### Contact (`routes/contact.js`)
- `GET /` → `generalLimiter`
- `GET /:id` → `generalLimiter` + `validators.mongoId`
- `POST /` → `contactLimiter` + `validateContactCreation`
- `PUT /:id` → `writeLimiter` + `validators.mongoId`
- `DELETE /:id` → `writeLimiter` + `validators.mongoId`

### Users (`routes/users.js`)
- `POST /sync` → `authLimiter` + `validateUserSync`
- `GET /profile` → `generalLimiter`
- `PUT /role` → `writeLimiter` + `validateRoleUpdate`

### Upload (`routes/upload.js`)
- `POST /image` → `uploadLimiter` + `validateImageMetadata`
- `DELETE /image/:id` → `writeLimiter` + `validators.mongoId`

### Blog (`routes/blog.js`)
- `GET /posts` → `generalLimiter` + `validators.paginationQuery`
- `GET /posts/:slug` → `generalLimiter` + `validators.slug`
- `POST /posts` → `writeLimiter` + `validateBlogPost`
- `POST /ai/chat` → `aiChatLimiter` + `validators.message`

### CMS (`routes/cms.js`)
- `GET /pages` → `generalLimiter`
- `GET /pages/:slug` → `generalLimiter` + `validators.slug`
- `PUT /pages/:slug` → `writeLimiter` + `validateCmsUpdate`

### AI Agents (`routes/agents.js`, `gerente.js`, `servicios.js`)
- Todos los endpoints → `aiChatLimiter` o `publicChatLimiter`
- Validación de comandos y mensajes
- Autenticación requerida para chat privado

---

## 🧪 Tests de Seguridad

Ubicación: `tests/security.test.js`

```bash
# Ejecutar todos los tests de seguridad
npm run test:security

# Ejecutar en modo watch
npm run test:watch

# Ejecutar todos los tests
npm run test
```

**Cobertura:**
- ✅ 11 tests de sanitización HTML
- ✅ 13 tests de sanitización de texto
- ✅ 7 tests de sanitización de objetos
- ✅ 15 tests de detección de patrones peligrosos
- ✅ 4 tests de integración API
- ✅ 2 tests de cobertura de exports

**Total: 54 tests pasando**

---

## 🔧 Configuración

### Variables de Entorno

```env
# Entorno
NODE_ENV=production

# Trust proxy (para obtener IP real detrás de proxy)
TRUST_PROXY=1

# Dominios permitidos para CORS
FRONTEND_URL=https://tu-dominio.com
```

### IPs de Confianza (Rate Limit Skip)

```javascript
// En securityMiddleware.js
skip: (req) => {
  const trustedIPs = ['127.0.0.1', '::1'];
  return trustedIPs.includes(req.ip);
}
```

---

## 📋 Checklist de Seguridad

### ✅ Implementado

- [x] Rate limiting en todas las rutas
- [x] Validación de inputs con express-validator
- [x] Sanitización de HTML con DOMPurify + sanitize-html
- [x] Headers HTTP seguros con Helmet
- [x] Protección contra XSS (scripts, event handlers, javascript: URLs)
- [x] Protección contra inyección SQL/NoSQL (validación de ObjectIds)
- [x] Logs de auditoría para acciones sensibles
- [x] Límites de tamaño de payload
- [x] Tests automatizados de seguridad

### ⏭️ Futuras Mejoras (Opcionales)

- [ ] CSRF tokens (necesario si se usan cookies de sesión)
- [ ] 2FA para administradores
- [ ] Rotación de secretos automática
- [ ] WAF (Web Application Firewall)
- [ ] Monitoreo de seguridad en tiempo real

---

## 🚨 Respuesta a Incidentes

### Si detectas un ataque:

1. **Rate Limit excedido repetidamente:**
   - Revisar logs: `tail -f logs/security.log`
   - Bloquear IP en firewall si es necesario

2. **Intentos de XSS/Injection:**
   - Los logs marcan con ⚠️ cada intento
   - Los datos ya están sanitizados, el atacante no tuvo éxito

3. **Abuso de endpoints de IA:**
   - Límite estricto de 5 req/min
   - Considerar agregar CAPTCHA si persiste

---

## 📚 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `middleware/securityMiddleware.js` | Rate limiters, validators, helmet config |
| `utils/sanitizer.js` | **Nuevo** - Módulo de sanitización |
| `tests/security.test.js` | **Nuevo** - Tests de seguridad |
| `routes/contact.js` | Rate limiting + validación |
| `routes/users.js` | Rate limiting + validación |
| `routes/upload.js` | Rate limiting + validación |
| `routes/blog.js` | Rate limiting + validación |
| `routes/cms.js` | Rate limiting + validación |
| `routes/agents.js` | Rate limiting + validación |
| `routes/gerente.js` | Rate limiting + validación |
| `routes/servicios.js` | Rate limiting + validación |
| `controllers/blogPostController.js` | Sanitización de outputs |
| `controllers/cmsController.js` | Sanitización de outputs |
| `controllers/userController.js` | Sanitización de outputs |
| `package.json` | Scripts de test + dependencias |
| `vitest.config.js` | **Nuevo** - Configuración de Vitest |

---

## 🎯 Resumen

El backend de Web Scuti ahora cuenta con **6 capas de protección**:

1. **Rate Limiting** - Previene ataques DoS/DDoS
2. **Validación de Inputs** - Bloquea datos maliciosos antes de procesarlos
3. **Sanitización de Outputs** - Limpia datos antes de enviarlos al cliente
4. **Headers HTTP** - Configura el navegador para seguridad adicional
5. **Logging de Auditoría** - Registra intentos de ataque
6. **Tests Automatizados** - Verifica que las protecciones funcionan

**Estado: ✅ Listo para Producción**

---

*Documentación generada automáticamente - Web Scuti Security Team*
