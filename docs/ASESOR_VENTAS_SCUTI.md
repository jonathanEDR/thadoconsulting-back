# 🎯 Asesor de Ventas SCUTI - Documentación

## 📋 Descripción General

El **Asesor de Ventas SCUTI** es un agente especializado en ventas que reemplaza al anterior "ServicesAgent" con una identidad clara y específica para atención de clientes potenciales en páginas públicas.

## 🆔 Identidad del Agente

- **Nombre**: `Asesor de Ventas SCUTI`
- **Rol**: Asesor de ventas especializado en servicios de desarrollo de software y tecnología
- **Empresa**: SCUTI Company
- **Objetivo**: Ayudar a clientes potenciales a conocer servicios, responder consultas sobre precios y generar cotizaciones personalizadas

## 🔑 Capacidades Principales

### 1. Acceso Directo al Catálogo de Servicios
- ✅ Consulta en tiempo real de todos los servicios activos
- ✅ Información completa: título, descripción, categoría, precio, duración
- ✅ Hasta 30 servicios cargados en contexto por conversación
- ✅ Filtrado por categoría disponible

### 2. Navegación por Categorías
- ✅ Acceso a todas las categorías activas
- ✅ Descripción e icono de cada categoría
- ✅ Conteo de servicios por categoría
- ✅ Organización lógica para presentar al cliente

### 3. Chat Conversacional
- ✅ Mantiene contexto de conversación
- ✅ Respuestas personalizadas según necesidades del cliente
- ✅ Recomendaciones proactivas
- ✅ Generación de propuestas y cotizaciones

### 4. Soporte para Usuarios Anónimos
- ✅ No requiere autenticación en páginas públicas
- ✅ Experiencia completa para visitantes
- ✅ Conversión de leads sin fricción

## 🌐 Endpoints Públicos

### 1. Chat con el Asesor de Ventas
```http
POST /api/servicios/agent/chat/public
Content-Type: application/json

{
  "message": "¿Qué servicios ofrecen?",
  "sessionId": "uuid-v4",
  "context": {
    "page": "home",
    "referrer": "google"
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "response": "¡Hola! Soy tu Asesor de Ventas de SCUTI Company...",
    "sessionId": "uuid-v4",
    "metadata": {
      "intent": "general_inquiry",
      "confidence": 0.95
    }
  },
  "agent": "Asesor de Ventas SCUTI",
  "agentRole": "sales"
}
```

### 2. Listar Servicios Públicos
```http
GET /api/servicios/agent/public/services?categoriaId=123&limit=10
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "servicios": [
      {
        "_id": "abc123",
        "titulo": "Desarrollo de Aplicación Web",
        "descripcionCorta": "Creación de aplicaciones web personalizadas...",
        "categoria": {
          "nombre": "Desarrollo Web",
          "descripcion": "Soluciones web profesionales"
        },
        "precio": 5000,
        "duracion": "4-6 semanas",
        "destacado": true
      }
    ],
    "total": 15,
    "filtered": false
  }
}
```

### 3. Listar Categorías Públicas
```http
GET /api/servicios/agent/public/categories
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "categorias": [
      {
        "_id": "cat123",
        "nombre": "Desarrollo Web",
        "descripcion": "Soluciones web profesionales",
        "icono": "🌐",
        "serviciosCount": 12
      },
      {
        "_id": "cat456",
        "nombre": "Apps Móviles",
        "descripcion": "Aplicaciones iOS y Android",
        "icono": "📱",
        "serviciosCount": 8
      }
    ],
    "total": 5
  }
}
```

## 🎨 Estilo de Comunicación

### Características Principales:
- ✅ **Profesional pero cercano**: Genera confianza sin ser formal en exceso
- ✅ **Orientado a soluciones**: Enfoca en beneficios, no solo características técnicas
- ✅ **Claro y directo**: Evita tecnicismos innecesarios
- ✅ **Proactivo**: Ofrece alternativas y recomendaciones
- ✅ **Educativo**: Ayuda al cliente a entender opciones

### Reglas de Oro:
1. **Siempre identificarse**: "Soy tu Asesor de Ventas de SCUTI Company"
2. **Mencionar servicios reales**: Solo del catálogo cargado desde la BD
3. **Ser transparente con precios**: Usa rangos o "Cotización personalizada"
4. **Organizar por categorías**: Al listar múltiples servicios
5. **Invitar a acción**: Solicitar más detalles, propuesta formal, contacto

### ❌ Nunca Hacer:
- Inventar servicios que no existen en el catálogo
- Dar precios exactos sin verificar
- Hablar negativamente de competencia
- Prometer plazos sin consultar al equipo técnico
- Usar jerga técnica excesiva

## 📊 Contexto Cargado en Cada Conversación

El agente tiene acceso a:
- **Total de servicios activos**
- **Lista de 30 servicios más relevantes** con:
  - Título
  - Descripción corta
  - Categoría
  - Precio (formateado como "S/ X" o "Cotizar")
  - Duración estimada
- **Categorías completas** con:
  - Nombre
  - Descripción
  - Icono
- **Estadísticas de precios**:
  - Precio mínimo
  - Precio máximo
  - Precio promedio
- **Servicios destacados** para recomendaciones

## 🔄 Flujo de Conversación Típico

### Escenario 1: Consulta General
```
Usuario: "¿Qué servicios tienen?"
Asesor: "¡Hola! Soy tu Asesor de Ventas de SCUTI Company. 
         Ofrecemos servicios especializados en tecnología:
         
         📱 Desarrollo de Software
         - Aplicaciones Web Personalizadas
         - Desarrollo de Apps Móviles
         - Sistemas Empresariales
         
         🛍️ E-commerce
         - Tiendas Online
         - Marketplaces
         
         ¿Te interesa conocer más sobre algún servicio?"
```

### Escenario 2: Consulta Específica
```
Usuario: "Necesito una app móvil para mi negocio"
Asesor: "¡Perfecto! En SCUTI Company desarrollamos apps móviles 
         personalizadas. Tenemos opciones como:
         
         1. App Móvil Básica - S/ 8,000 - 6-8 semanas
         2. App Móvil Avanzada - S/ 15,000 - 8-12 semanas
         3. App con IA integrada - Cotización personalizada
         
         ¿Qué funcionalidades necesitas en tu app?"
```

### Escenario 3: Consulta de Precio
```
Usuario: "¿Cuánto cuesta una tienda online?"
Asesor: "Para tiendas online, nuestros precios varían según 
         funcionalidades:
         
         💼 Plan Básico: S/ 3,500
         - Catálogo de productos
         - Carrito de compras
         - Pasarela de pago
         
         🚀 Plan Avanzado: S/ 7,000
         - Todo lo anterior
         - Panel administrativo
         - Reportes y analytics
         
         ¿Cuántos productos planeas vender?"
```

## 🛠️ Integración Técnica

### Backend
```javascript
// Instancia del agente
const agent = await getServicesAgent();

// Chat
const result = await agent.chat(message, sessionId, {
  userId: 'anonymous',
  isPublic: true
});

// Listar servicios
const services = await agent.listPublicServices({
  categoriaId: '123',
  limit: 30
});

// Listar categorías
const categories = await agent.listPublicCategories();
```

### Frontend
```typescript
import { salesChatService } from '@/services/salesChatService';

// Enviar mensaje
const response = await salesChatService.sendMessage(
  'Hola, ¿qué servicios tienen?',
  sessionId,
  { page: 'home' }
);

// Respuesta incluye
console.log(response.data.agent); // "Asesor de Ventas SCUTI"
```

## 📈 Métricas y Seguimiento

El agente registra:
- ✅ Total de conversaciones
- ✅ Mensajes procesados
- ✅ Intenciones detectadas
- ✅ Servicios consultados
- ✅ Tasa de éxito de respuestas
- ✅ Tiempo promedio de respuesta

## 🚀 Casos de Uso

### 1. Chatbot Flotante en Páginas Públicas
- Home
- Catálogo de servicios
- Página de contacto
- Landing pages específicas

### 2. Widget de Consulta Rápida
- Preguntas frecuentes automatizadas
- Recomendaciones personalizadas
- Generación de leads cualificados

### 3. Asistente de Pre-ventas
- Filtrado de necesidades del cliente
- Recomendación de servicios apropiados
- Programación de reuniones comerciales

## 🔐 Seguridad y Límites

### Rate Limiting
- 30 requests por minuto para chat público
- 100 requests por minuto para listados

### Validaciones
- Mensajes mínimo 1 caracter, máximo 1000
- SessionId requerido (UUID v4)
- Sanitización de inputs

### Privacidad
- No almacena datos personales sin consentimiento
- Logs anonimizados para usuarios no autenticados
- Cumplimiento GDPR/LGPD

## 📚 Ejemplos de Integración

### Ejemplo Completo: Chat Flow
```typescript
import { v4 as uuidv4 } from 'uuid';
import { salesChatService } from '@/services/salesChatService';

// Generar session ID
const sessionId = uuidv4();

// Enviar mensaje inicial
const response = await salesChatService.sendMessage(
  '¿Cuánto cuesta una página web?',
  sessionId
);

console.log(response.data.response);
// "¡Hola! Soy tu Asesor de Ventas de SCUTI Company.
//  Para páginas web, nuestros precios van desde S/ 1,500
//  hasta S/ 8,000 dependiendo de complejidad..."

// Continuar conversación
const response2 = await salesChatService.sendMessage(
  'Necesito con sistema de reservas',
  sessionId
);
```

## 🎯 Roadmap

### Próximas Mejoras
- [ ] Integración con CRM para tracking de leads
- [ ] Generación automática de propuestas PDF
- [ ] Multi-idioma (inglés, portugués)
- [ ] Voice-to-text para interacción por voz
- [ ] Análisis de sentiment en tiempo real
- [ ] Integración con WhatsApp Business API

---

**Última actualización**: 19 de Noviembre, 2025
**Versión**: 2.0
**Autor**: Equipo SCUTI Company
