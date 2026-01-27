# 🎭 Separación de Roles: Asesor de Ventas vs Administrador de Servicios

## 📋 Problema Identificado

El chatbot funcionaba correctamente pero usaba **un solo prompt** con enfoque mixto (ventas + administración), lo que causaba confusión en páginas públicas:

```
Usuario en página pública: "¿Qué servicios ofrecen?"
Bot: "Como Asesor de Ventas SCUTI Assistant, puedo brindarte asistencia en:
      1. Asesoramiento en ventas
      2. Soporte en la gestión de clientes
      3. Análisis de datos de ventas
      4. Optimización de procesos de ventas
      ..." ❌
```

**Problema**: Responde como **asistente de gestión administrativa** en lugar de **asesor comercial**.

---

## ✅ Solución Implementada

Creamos **dos personalidades distintas** según el contexto:

### 1. 🎯 Asesor de Ventas SCUTI (Páginas Públicas)

**Cuándo se activa**: `context.isPublic === true`

**Identidad**:
- Nombre: "Asesor de Ventas SCUTI"
- Rol: Consultor comercial especializado
- Objetivo: Convertir consultas en ventas

**Características**:
- ✅ Tono cercano y amigable
- ✅ Enfoque en beneficios para el cliente
- ✅ Presenta 3-5 servicios por respuesta
- ✅ Precios transparentes
- ✅ Call-to-action constante
- ✅ Ejemplos con emojis y formato atractivo

**Ejemplo de respuesta**:
```
¡Perfecto! Te puedo ayudar con eso 😊

En SCUTI Company desarrollamos tiendas online completas y rentables:

🛍️ **E-commerce Básico** - S/ 3,500
- Catálogo ilimitado de productos
- Carrito + pasarela de pago
- Panel de administración
- ⏱️ Listo en 3-4 semanas

🚀 **E-commerce Pro** - S/ 7,000  
- Todo lo anterior +
- Sistema de inventario
- Reportes y analytics
- Email marketing
- ⏱️ Listo en 5-6 semanas

¿Qué tipo de productos vas a vender? 🎯
```

---

### 2. 👨‍💼 Asistente de Gestión de Servicios (Panel Admin)

**Cuándo se activa**: `context.isPublic === false` o sin contexto

**Identidad**:
- Nombre: "Asistente de Gestión de Servicios"
- Rol: Especialista administrativo
- Objetivo: Optimizar portafolio de servicios

**Características**:
- ✅ Tono profesional y técnico
- ✅ Enfoque en tareas operativas
- ✅ Sugerencias con mejores prácticas
- ✅ Templates y estructuras
- ✅ Análisis y optimización

**Ejemplo de respuesta**:
```
Te ayudo a estructurar el servicio de Desarrollo Móvil:

**TÍTULO SUGERIDO:**
Desarrollo de Aplicación Móvil Nativa (iOS/Android)

**DESCRIPCIÓN CORTA (150 caracteres):**
Creamos apps móviles nativas personalizadas para iOS y Android...

**CARACTERÍSTICAS PRINCIPALES:**
✅ Desarrollo nativo (Swift/Kotlin)
✅ Diseño UX/UI profesional
✅ Integración de APIs
...

**PRECIO SUGERIDO:**
S/ 8,000 - S/ 15,000 (según complejidad)
Justificación: Alineado con tu rango actual

¿Quieres que genere las FAQs también?
```

---

## 🔧 Implementación Técnica

### Archivo Modificado
`backend/agents/specialized/services/handlers/ServicesChatHandler.js`

### Métodos Creados

#### 1. `buildSalesPrompt(servicesContext, servicesListText)`
Genera el prompt para el **Asesor de Ventas** con:
- Identidad comercial clara
- Catálogo de servicios con precios
- Ejemplos de respuestas de ventas
- Tono amigable y persuasivo
- Enfoque en beneficios

#### 2. `buildAdminPrompt(servicesContext, servicesListText)`
Genera el prompt para el **Asistente Administrativo** con:
- Identidad operativa
- Estadísticas del portafolio
- Capacidades de gestión
- Tono técnico y profesional
- Enfoque en optimización

#### 3. `buildChatPrompt()` (modificado)
Detecta el contexto y elige el prompt correcto:

```javascript
buildChatPrompt(message, session, servicesContext, intent, context = {}) {
  // 🎯 Detectar contexto
  const isPublicContext = context.isPublic === true;
  
  // Construir lista de servicios
  const servicesListText = servicesContext.availableServices
    .map((s, i) => `${i + 1}. ${s.titulo} (${s.categoria}) - ${s.precio}`)
    .join('\n');

  // 🎭 Elegir prompt según contexto
  const systemPrompt = isPublicContext 
    ? this.buildSalesPrompt(servicesContext, servicesListText)
    : this.buildAdminPrompt(servicesContext, servicesListText);

  // ... resto del código
}
```

---

## 🌐 Flujo de Uso

### Flujo Público (Ventas)

```
Usuario anónimo en Home/Services/Contact
    ↓
Click en botón flotante del chat
    ↓
FloatingChatWidget
    ↓
useFloatingChat hook
    ↓
salesChatService.sendMessage(message, sessionId, { userId: 'anonymous' })
    ↓
POST /api/servicios/agent/chat/public
    ↓
chatWithServicesAgentPublic(req, res)
    ↓
agent.chat(message, sessionId, {
  userId: 'anonymous',
  isPublic: true  ← ✅ CLAVE
})
    ↓
ServicesChatHandler.handleChatMessage()
    ↓
ServicesChatHandler.buildChatPrompt()
    ↓
if (context.isPublic === true)
  → buildSalesPrompt() ✅ ASESOR DE VENTAS
    ↓
OpenAI genera respuesta comercial
    ↓
Usuario recibe respuesta de ventas
```

### Flujo Admin (Gestión)

```
Usuario autenticado en panel admin
    ↓
Chat en módulo de servicios
    ↓
ScutiAI component
    ↓
POST /api/servicios/agent/chat
    ↓
chatWithServicesAgent(req, res)
    ↓
agent.chat(message, sessionId, {
  userId: 'user_xxx',
  isPublic: false  ← ✅ CLAVE (o sin especificar)
})
    ↓
ServicesChatHandler.buildChatPrompt()
    ↓
if (context.isPublic !== true)
  → buildAdminPrompt() ✅ ASISTENTE ADMINISTRATIVO
    ↓
OpenAI genera respuesta operativa
    ↓
Usuario recibe ayuda administrativa
```

---

## 📊 Comparación de Respuestas

### Pregunta: "¿Qué servicios ofrecen?"

#### ❌ Antes (Prompt Mixto)
```
Como Asesor de Ventas SCUTI Assistant, puedo brindarte asistencia en:
1. Asesoramiento en ventas
2. Soporte en la gestión de clientes
3. Análisis de datos de ventas
4. Optimización de procesos de ventas
5. Asistencia en estrategias de marketing

¿Necesitas ayuda con algo específico?
```
**Problema**: Habla de "asistencia en ventas" en lugar de **vender servicios**

#### ✅ Después (Prompt de Ventas)
```
¡Hola! Soy tu Asesor de Ventas de SCUTI Company 👋

Ofrecemos servicios especializados en desarrollo de software:

📱 **Desarrollo de Software**
- Aplicaciones Web Personalizadas - S/ 5,000
- Apps Móviles iOS/Android - S/ 8,000
- Sistemas Empresariales - Cotización personalizada

🛍️ **E-commerce**
- Tiendas Online - S/ 3,500
- Marketplaces - S/ 10,000

🤖 **Inteligencia Artificial**
- Chatbots Inteligentes - S/ 4,500
- Automatización de Procesos - Cotización

Contamos con 12 servicios activos. ¿Te interesa alguno en particular? 
También puedo darte información sobre plazos y forma de pago 💳
```
**Mejora**: Presenta **servicios reales**, precios, y genera interés comercial

---

## 🎯 Diferencias Clave

| Aspecto | Asesor de Ventas (Público) | Administrador (Admin) |
|---------|---------------------------|----------------------|
| **Objetivo** | Vender servicios | Gestionar portafolio |
| **Tono** | Amigable, persuasivo | Profesional, técnico |
| **Enfoque** | Beneficios para cliente | Optimización operativa |
| **Información** | Precios, plazos, valor | Estadísticas, mejores prácticas |
| **Emojis** | Sí ✅ 😊 🎯 | Mínimos o ninguno |
| **Call-to-action** | Siempre presente | Solo cuando relevante |
| **Ejemplos** | Casos de uso del cliente | Templates y estructuras |
| **Lenguaje** | Simple y claro | Puede ser técnico |

---

## 🧪 Testing

### Test 1: Contexto Público
```bash
curl -X POST http://localhost:5000/api/servicios/agent/chat/public \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Qué servicios ofrecen?",
    "sessionId": "test-public-123",
    "context": { "page": "home" }
  }'
```

**Resultado Esperado**:
- Respuesta con tono de ventas
- Menciona servicios con precios
- Incluye emojis
- Call-to-action presente
- Logs: `📦 [AI REQUEST] System prompt length: ~5500 chars`

### Test 2: Contexto Admin
```bash
curl -X POST http://localhost:5000/api/servicios/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "message": "Ayúdame a crear un nuevo servicio",
    "sessionId": "test-admin-456"
  }'
```

**Resultado Esperado**:
- Respuesta técnica y estructurada
- Sugerencias de mejores prácticas
- Templates y formatos
- Tono profesional
- Logs: `📦 [AI REQUEST] System prompt length: ~4200 chars`

---

## 📈 Logs de Verificación

### Logs Correctos - Contexto Público
```
💬 [PUBLIC] Sales chat from anonymous user
💬 Asesor de Ventas SCUTI - Message: "¿Qué servicios ofrecen?..."
📊 [CONTEXT] Loaded 12 services for AI context
📦 [AI REQUEST] System prompt length: 5487 chars    ← Prompt de ventas
📦 [AI REQUEST] User message: "¿Qué servicios ofrecen?..."
📦 [AI REQUEST] Total messages: 2
🤖 Calling OpenAI API for Asesor de Ventas SCUTI (2116 tokens)
✅ [AI RESPONSE] Received: "¡Hola! Soy tu Asesor de Ventas..."
```

### Logs Correctos - Contexto Admin
```
💬 Admin chat from user_2abc123
💬 Asesor de Ventas SCUTI - Message: "Ayúdame a crear servicio..."
📊 [CONTEXT] Loaded 12 services for AI context
📦 [AI REQUEST] System prompt length: 4125 chars    ← Prompt admin
📦 [AI REQUEST] User message: "Ayúdame a crear servicio..."
📦 [AI REQUEST] Total messages: 2
🤖 Calling OpenAI API for Asesor de Ventas SCUTI (1850 tokens)
✅ [AI RESPONSE] Received: "Te ayudo a estructurar el servicio..."
```

---

## 🔜 Mejoras Futuras

- [ ] Agregar más ejemplos de respuestas por tipo de consulta
- [ ] Personalizar según la página donde está el usuario (Home, Services, Contact)
- [ ] Detectar idioma y responder en inglés si es necesario
- [ ] Integrar con CRM para tracking de leads generados
- [ ] A/B testing de diferentes tonos de ventas
- [ ] Métricas de conversión por tipo de respuesta

---

**Fecha**: 19 de Noviembre, 2025
**Versión**: 2.1
**Estado**: ✅ IMPLEMENTADO
