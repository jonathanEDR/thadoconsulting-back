# 🔒 Rate Limiting - Chatbot Público

## 📋 Descripción

Sistema de protección contra abuso para el chatbot de ventas público mediante limitación de tasa (rate limiting) por dirección IP.

## 🎯 Objetivo

Prevenir:
- ✅ Spam de mensajes
- ✅ Ataques de denegación de servicio (DoS)
- ✅ Abuso de recursos de OpenAI
- ✅ Costos excesivos de API
- ✅ Saturación del servidor

## 🔐 Configuración de Límites

### Chat Público (Por IP)

```javascript
windowMs: 10 * 60 * 1000  // 10 minutos
max: 20                    // 20 mensajes máximo
```

**Esto significa:**
- Cada IP puede enviar máximo **20 mensajes cada 10 minutos**
- Si se excede, se bloquea durante 10 minutos
- Aplica tanto para usuarios anónimos como autenticados

### Listados Públicos (Servicios y Categorías)

```javascript
windowMs: 15 * 60 * 1000  // 15 minutos
max: 30                    // 30 requests máximo
```

**Esto significa:**
- Cada IP puede consultar máximo **30 veces cada 15 minutos**
- Endpoints afectados:
  - `GET /api/servicios/agent/public/services`
  - `GET /api/servicios/agent/public/categories`

## 🌐 Identificación de IP

El sistema identifica IPs reales considerando proxies:

```javascript
keyGenerator: (req) => {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         'unknown';
}
```

**Compatible con:**
- ✅ Render
- ✅ Vercel
- ✅ Heroku
- ✅ AWS
- ✅ Nginx reverse proxy
- ✅ Cloudflare

## 📡 Respuesta de Rate Limit

### Cuando se excede el límite:

**Status Code:** `429 Too Many Requests`

**Respuesta JSON:**
```json
{
  "success": false,
  "error": "⏱️ Has alcanzado el límite de mensajes. Por favor espera unos minutos antes de continuar.",
  "retryAfter": 600
}
```

**Headers HTTP:**
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1732064925
Retry-After: 600
```

## 🎨 Experiencia de Usuario

### Frontend - Manejo de Errores

El servicio `salesChatService.ts` detecta el error 429 y muestra un mensaje amigable:

```typescript
if (response.status === 429) {
  const retryAfter = errorData.retryAfter || 600;
  const minutes = Math.ceil(retryAfter / 60);
  throw new Error(
    `⏱️ Has alcanzado el límite de mensajes. Por favor espera ${minutes} minutos.`
  );
}
```

### Usuario ve en el chat:
```
💬 Usuario: "Hola, ¿qué servicios tienen?"
🤖 Asesor: [... respuesta normal ...]

💬 Usuario: [... 20 mensajes más ...]
🤖 Sistema: "⏱️ Has alcanzado el límite de mensajes. Por favor espera 10 minutos antes de continuar."
```

## 📊 Monitoreo

### Logs en Backend

Cuando se bloquea una IP:
```
🚫 [RATE LIMIT] Chat público bloqueado para IP: 192.168.1.100
```

### Logs en Frontend

Cuando se recibe error de rate limit:
```
❌ [SalesChatService] Error: ⏱️ Has alcanzado el límite de mensajes. Por favor espera 10 minutos.
```

## 🔧 Configuración Personalizada

### Para ajustar límites:

**Archivo:** `backend/routes/servicios.js`

```javascript
const publicChatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // Cambiar aquí: tiempo de ventana
  max: 20,                    // Cambiar aquí: máximo de requests
  // ...
});
```

### Valores recomendados por escenario:

| Escenario | windowMs | max | Descripción |
|-----------|----------|-----|-------------|
| **Desarrollo** | 1 min | 100 | Sin restricciones prácticas |
| **Testing** | 5 min | 50 | Pruebas cómodas |
| **Producción** | 10 min | 20 | Balance seguridad/UX |
| **Alta seguridad** | 15 min | 10 | Muy restrictivo |

## 🚀 Casos de Uso

### Caso 1: Usuario Legítimo
```
Usuario visita sitio web
   ↓
Hace 5 preguntas sobre servicios (OK ✅)
   ↓
Recibe respuestas normalmente
   ↓
Continúa navegando sin problemas
```

### Caso 2: Bot/Spam
```
Bot envía 30 mensajes en 2 minutos
   ↓
Mensaje 21 recibe error 429 (BLOQUEADO 🚫)
   ↓
Debe esperar 10 minutos
   ↓
Después de 10 min, puede enviar nuevamente
```

### Caso 3: Usuario Excede Límite Accidentalmente
```
Usuario envía 20 mensajes rápidos
   ↓
Mensaje 21 recibe error amigable
   ↓
Ve: "⏱️ Espera 10 minutos" (comprende la razón)
   ↓
Después de 10 min, continúa normalmente
```

## 🛡️ Seguridad Adicional

### 1. Sin Bypass para Usuarios Autenticados
- Aunque el usuario esté logueado, aplica el límite por IP
- Evita que usuarios autenticados hagan spam

### 2. Counting All Requests
```javascript
skipSuccessfulRequests: false  // Cuenta todas
skipFailedRequests: false      // Incluso las fallidas
```

### 3. Headers Estándares
```javascript
standardHeaders: true   // X-RateLimit-* headers
legacyHeaders: false    // No usar X-Rate-Limit-* antiguo
```

## 📈 Métricas Sugeridas

### Monitorear en producción:

1. **Rate limit hits por hora**
   - Indica si hay intentos de abuso
   - Normal: < 5/hora
   - Alerta: > 20/hora

2. **IPs únicas bloqueadas**
   - Rastrea IPs problemáticas
   - Considerar blacklist si es recurrente

3. **Tiempo promedio entre mensajes**
   - Usuario normal: 30-60 segundos
   - Bot: < 5 segundos

## 🔄 Integración con Frontend

### Hook `useFloatingChat`

Cambios implementados para usuarios anónimos:

```typescript
// ✅ ANTES: Requería userId (bloqueaba anónimos)
if (!userId) {
  console.error('❌ No userId available');
  return;
}

// ✅ AHORA: Funciona con anónimos
const userIdentifier = userId || 'anonymous';
console.log(`📤 Sending message as: ${userIdentifier}`);
```

### Session Management

```typescript
// ✅ Sesión funciona con o sin userId
const identifier = userId || 'anonymous';
const newSessionId = `floating-chat-${identifier}-${Date.now()}`;
```

## 🧪 Testing

### Prueba Manual

1. **Abrir DevTools** → Console
2. **Enviar 20 mensajes** rápidamente
3. **Mensaje 21** debe mostrar error de rate limit
4. **Esperar 10 minutos**
5. **Intentar nuevamente** → Debe funcionar

### Comando curl para testing:

```bash
# Enviar 21 mensajes seguidos
for i in {1..21}; do
  curl -X POST http://localhost:5000/api/servicios/agent/chat/public \
    -H "Content-Type: application/json" \
    -d '{
      "message": "Test '$i'",
      "sessionId": "test-session-123",
      "context": {}
    }'
  echo "\n---\n"
done
```

**Resultado esperado:**
- Mensajes 1-20: Respuestas normales
- Mensaje 21: Error 429 con "retryAfter": 600

## 📚 Referencias

- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [HTTP 429 Status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

## 🔜 Mejoras Futuras

- [ ] Rate limiting por usuario autenticado (más permisivo)
- [ ] Whitelist de IPs confiables
- [ ] Dashboard de métricas en tiempo real
- [ ] Notificaciones por Slack cuando se detecta abuso
- [ ] Rate limiting adaptativo basado en carga del servidor
- [ ] CAPTCHA después de exceder límite X veces

---

**Última actualización**: 19 de Noviembre, 2025
**Versión**: 1.0
**Autor**: Equipo SCUTI Company
