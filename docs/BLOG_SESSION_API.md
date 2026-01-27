# 💬 Blog Conversational Sessions API

Sistema de creación de blogs mediante conversación guiada. El usuario responde preguntas progresivamente y el agente genera contenido de alta calidad (SEO 97/100).

## 🎯 Flujo General

```
1. Iniciar sesión       → GET session ID + mensaje de bienvenida
2. Descubrir tema       → Usuario responde: "Quiero escribir sobre..."
3. Seleccionar tipo     → Usuario elige template (tutorial, guía, técnico, etc)
4. Recolectar detalles  → Audiencia, longitud, palabras clave
5. Elegir categoría     → Seleccionar de lista disponible
6. Revisar configuración → Ver resumen y confirmar
7. Generar contenido    → BlogAgent genera con template (2-3 min)
8. Guardar borrador     → Crear BlogPost en estado "draft"
```

---

## 📡 Endpoints

### 1. Iniciar Sesión

**POST** `/api/agents/blog/session/start`

Crea una nueva sesión conversacional.

#### Request
```json
{
  "startedFrom": "dashboard" // opcional
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1234567890_abc123",
    "message": "¡Hola! 👋 Soy tu asistente de creación de contenido...",
    "questions": [
      "¿Sobre qué tema te gustaría escribir?",
      "¿Qué problema quieres resolver con este artículo?"
    ],
    "status": "active",
    "stage": "topic_discovery",
    "progress": 5
  }
}
```

---

### 2. Enviar Mensaje

**POST** `/api/agents/blog/session/:sessionId/message`

Envía un mensaje en la conversación.

#### Request
```json
{
  "message": "Quiero escribir sobre Next.js 14 y las nuevas características del App Router"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "message": "¡Excelente tema! 🎯\n\nHe generado este título: **Guía Completa de Next.js 14: App Router y Server Components**",
    "questions": [
      "¿Qué tipo de contenido prefieres?",
      "1️⃣ Tutorial paso a paso",
      "2️⃣ Guía completa con ejemplos",
      "3️⃣ Artículo técnico avanzado",
      "4️⃣ Contenido informativo",
      "5️⃣ Análisis de opinión"
    ],
    "stage": "type_selection",
    "progress": 20,
    "context": {
      "suggestedTitle": "Guía Completa de Next.js 14: App Router y Server Components",
      "detectedKeywords": ["Next.js 14", "App Router", "Server Components"]
    }
  }
}
```

#### Respuesta con Generación Iniciada
```json
{
  "success": true,
  "data": {
    "status": "generating",
    "message": "🎨 Generando contenido... Esto tomará 2-3 minutos.",
    "sessionId": "sess_1234567890_abc123",
    "pollUrl": "/api/agents/blog/session/sess_1234567890_abc123",
    "shouldGenerate": true
  }
}
```

---

### 3. Generar Contenido (Directo)

**POST** `/api/agents/blog/session/:sessionId/generate`

Inicia la generación de contenido manualmente (útil si se necesita regenerar).

#### Response
```json
{
  "success": true,
  "data": {
    "status": "generating",
    "message": "🎨 Generación iniciada",
    "sessionId": "sess_1234567890_abc123",
    "pollUrl": "/api/agents/blog/session/sess_1234567890_abc123",
    "estimatedTime": "2-3 minutos"
  }
}
```

---

### 4. Obtener Estado de Sesión

**GET** `/api/agents/blog/session/:sessionId`

Consulta el estado actual de la sesión (útil para polling durante generación).

#### Response (Generando)
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1234567890_abc123",
    "status": "generating",
    "stage": "content_generation",
    "progress": 95,
    "collected": {
      "topic": "Next.js 14 y App Router",
      "title": "Guía Completa de Next.js 14",
      "postType": "guide",
      "template": "guide",
      "audience": "intermediate",
      "length": "long",
      "keywords": ["Next.js 14", "App Router", "Server Components"],
      "category": "64abc123def456789",
      "tone": "professional",
      "style": "educational"
    },
    "generationStatus": {
      "generationId": "gen_1234567890",
      "status": "generating",
      "startedAt": "2024-01-15T10:30:00Z",
      "estimatedCompletion": "2024-01-15T10:33:00Z"
    },
    "conversationHistory": [
      {
        "role": "agent",
        "message": "¡Hola! 👋...",
        "timestamp": "2024-01-15T10:25:00Z"
      },
      {
        "role": "user",
        "message": "Quiero escribir sobre Next.js 14...",
        "timestamp": "2024-01-15T10:26:00Z"
      }
    ]
  }
}
```

#### Response (Completado)
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1234567890_abc123",
    "status": "completed",
    "stage": "draft_saved",
    "progress": 100,
    "collected": { /* ... */ },
    "result": {
      "content": "# Guía Completa de Next.js 14\n\n## Introducción...",
      "metadata": {
        "wordCount": 2847,
        "readingTime": 11,
        "seoScore": 97,
        "structure": {
          "hasH2": true,
          "hasH3": true,
          "hasList": true,
          "hasCode": true
        }
      },
      "draft": {
        "id": "post_123456",
        "slug": "guia-completa-nextjs-14"
      }
    },
    "actions": [
      {
        "id": "save_draft",
        "label": "💾 Guardar como borrador",
        "endpoint": "/api/agents/blog/session/sess_1234567890_abc123/save",
        "method": "POST"
      },
      {
        "id": "regenerate",
        "label": "🔄 Regenerar contenido",
        "endpoint": "/api/agents/blog/session/sess_1234567890_abc123/generate",
        "method": "POST"
      }
    ]
  }
}
```

---

### 5. Guardar Borrador

**POST** `/api/agents/blog/session/:sessionId/save`

Guarda el contenido generado como borrador en BlogPost.

#### Request
```json
{
  "tags": ["nextjs", "react", "javascript"], // opcional
  "customData": {
    "excerpt": "Una guía completa sobre...", // opcional
    "metaDescription": "Aprende todo sobre Next.js 14..." // opcional
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "✅ Borrador guardado exitosamente",
  "data": {
    "id": "64abc123def456789",
    "title": "Guía Completa de Next.js 14",
    "slug": "guia-completa-nextjs-14",
    "status": "draft",
    "author": "user_123",
    "category": "Desarrollo Web",
    "tags": ["nextjs", "react", "javascript"],
    "seoScore": 97,
    "createdAt": "2024-01-15T10:35:00Z",
    "url": "/blog/editor/64abc123def456789",
    "sessionId": "sess_1234567890_abc123",
    "nextSteps": [
      "✏️ Editar contenido si lo deseas",
      "🖼️ Agregar imagen destacada",
      "🏷️ Revisar y ajustar tags",
      "📝 Publicar cuando estés listo"
    ]
  }
}
```

---

### 6. Cancelar Sesión

**DELETE** `/api/agents/blog/session/:sessionId`

Cancela una sesión activa.

#### Response
```json
{
  "success": true,
  "message": "Sesión cancelada exitosamente",
  "data": {
    "sessionId": "sess_1234567890_abc123",
    "status": "cancelled"
  }
}
```

---

### 7. Listar Sesiones del Usuario

**GET** `/api/agents/blog/sessions`

Lista todas las sesiones del usuario autenticado.

#### Query Parameters
- `status` (opcional): `active` | `completed` | `cancelled` | `expired`
- `limit` (opcional): Número de resultados (default: 10)
- `page` (opcional): Página actual (default: 1)

#### Response
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "sess_1234567890_abc123",
        "status": "completed",
        "stage": "draft_saved",
        "progress": 100,
        "title": "Guía Completa de Next.js 14",
        "template": "guide",
        "createdAt": "2024-01-15T10:25:00Z",
        "updatedAt": "2024-01-15T10:35:00Z",
        "expiresAt": "2024-01-16T10:25:00Z"
      },
      {
        "sessionId": "sess_0987654321_xyz789",
        "status": "active",
        "stage": "details_collection",
        "progress": 50,
        "title": "Introducción a TypeScript",
        "template": "tutorial",
        "createdAt": "2024-01-15T09:15:00Z",
        "updatedAt": "2024-01-15T09:22:00Z",
        "expiresAt": "2024-01-16T09:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "pages": 2
    }
  }
}
```

---

## 🔒 Autenticación

Todos los endpoints requieren autenticación vía Clerk JWT:

```http
Authorization: Bearer <clerk_jwt_token>
```

---

## ⚡ Códigos de Error

| Código | Descripción |
|--------|-------------|
| `SESSION_EXPIRED` | La sesión ha expirado (24h TTL) |
| `NO_CONTENT` | No hay contenido generado para guardar |
| `INCOMPLETE_DATA` | Faltan datos requeridos para generar |
| `INVALID_STAGE` | Operación no permitida en esta etapa |
| `SESSION_NOT_FOUND` | Sesión no encontrada o sin acceso |

---

## 📊 Estados y Etapas

### Estados de Sesión (`status`)
- `active` - Sesión activa en conversación
- `generating` - Generando contenido con BlogAgent
- `completed` - Generación completada exitosamente
- `cancelled` - Sesión cancelada por el usuario
- `expired` - Sesión expirada (TTL 24h)

### Etapas de Conversación (`stage`)
1. `initialized` (5%) - Sesión creada
2. `topic_discovery` (20%) - Descubriendo tema
3. `type_selection` (35%) - Seleccionando template
4. `details_collection` (50%) - Recolectando detalles
5. `category_selection` (65%) - Eligiendo categoría
6. `review_and_confirm` (80%) - Revisando configuración
7. `final_confirmation` (90%) - Confirmación final
8. `content_generation` (95%) - Generando contenido
9. `generation_completed` (98%) - Generación completa
10. `draft_saved` (100%) - Borrador guardado

---

## 🎨 Templates Disponibles

| Template | Descripción | Ideal Para |
|----------|-------------|------------|
| `tutorial` | Tutorial paso a paso | Guías prácticas, walkthroughs |
| `guide` | Guía completa con ejemplos | Documentación, manuales |
| `technical` | Artículo técnico avanzado | Deep dives, arquitectura |
| `informative` | Contenido informativo | Noticias, actualizaciones |
| `opinion` | Análisis de opinión | Reviews, comparativas |

---

## 💡 Ejemplo de Flujo Completo

```javascript
// 1. Iniciar sesión
const session = await fetch('/api/agents/blog/session/start', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ startedFrom: 'dashboard' })
});

const { sessionId } = session.data;

// 2. Enviar respuesta sobre tema
await fetch(`/api/agents/blog/session/${sessionId}/message`, {
  method: 'POST',
  body: JSON.stringify({ 
    message: 'Quiero escribir sobre Next.js 14' 
  })
});

// 3. Seleccionar template
await fetch(`/api/agents/blog/session/${sessionId}/message`, {
  method: 'POST',
  body: JSON.stringify({ 
    message: '2' // Guía completa
  })
});

// 4. Proporcionar detalles
await fetch(`/api/agents/blog/session/${sessionId}/message`, {
  method: 'POST',
  body: JSON.stringify({ 
    message: 'Audiencia: desarrolladores intermedios, Longitud: artículo largo' 
  })
});

// 5. Elegir categoría
await fetch(`/api/agents/blog/session/${sessionId}/message`, {
  method: 'POST',
  body: JSON.stringify({ 
    message: '1' // Primera categoría de la lista
  })
});

// 6. Confirmar
const genResponse = await fetch(`/api/agents/blog/session/${sessionId}/message`, {
  method: 'POST',
  body: JSON.stringify({ 
    message: 'sí, generar' 
  })
});

// 7. Polling para verificar estado (cada 5s)
const pollInterval = setInterval(async () => {
  const status = await fetch(`/api/agents/blog/session/${sessionId}`);
  
  if (status.data.status === 'completed') {
    clearInterval(pollInterval);
    console.log('✅ Contenido generado:', status.data.result);
    
    // 8. Guardar borrador
    const draft = await fetch(`/api/agents/blog/session/${sessionId}/save`, {
      method: 'POST',
      body: JSON.stringify({
        tags: ['nextjs', 'react', 'javascript']
      })
    });
    
    console.log('📝 Borrador guardado:', draft.data.url);
  }
}, 5000);
```

---

## 🚀 Integración con Frontend

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

export function useBlogConversation() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const startSession = async () => {
    setLoading(true);
    const response = await fetch('/api/agents/blog/session/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    setSession(data.data);
    setLoading(false);
    return data.data;
  };
  
  const sendMessage = async (message: string) => {
    setLoading(true);
    const response = await fetch(
      `/api/agents/blog/session/${session.sessionId}/message`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      }
    );
    const data = await response.json();
    
    if (data.data.shouldGenerate) {
      setGenerating(true);
      pollGeneration(session.sessionId);
    }
    
    setSession({ ...session, ...data.data });
    setLoading(false);
    return data.data;
  };
  
  const pollGeneration = async (sessionId: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(
        `/api/agents/blog/session/${sessionId}`
      );
      const data = await response.json();
      
      if (data.data.status === 'completed') {
        clearInterval(interval);
        setGenerating(false);
        setSession(data.data);
      }
    }, 5000);
  };
  
  const saveDraft = async (tags?: string[]) => {
    const response = await fetch(
      `/api/agents/blog/session/${session.sessionId}/save`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tags })
      }
    );
    return await response.json();
  };
  
  return {
    session,
    loading,
    generating,
    startSession,
    sendMessage,
    saveDraft
  };
}
```

---

## 📝 Notas

1. **TTL**: Las sesiones expiran automáticamente después de 24 horas
2. **Generación**: El proceso toma 2-3 minutos, implementar polling cada 5 segundos
3. **SEO**: El contenido generado tiene un score promedio de 97/100
4. **Templates**: Cada template tiene estructura y requisitos específicos
5. **Regeneración**: Se puede regenerar contenido con el endpoint `/generate`
6. **Edición**: Los borradores guardados se pueden editar en `/blog/editor/:id`

---

## 🔗 Recursos Relacionados

- [BLOG_CONVERSATION_FLOW.md](../docs/BLOG_CONVERSATION_FLOW.md) - Flujo detallado
- [BlogAgent Refactoring Guide](../docs/BLOGAGENT_REFACTORING_GUIDE.md) - Arquitectura
- [Content Templates](../utils/contentTemplates.js) - Templates disponibles
- [SEO Monitoring](./SEO_MONITOR_API.md) - Sistema de monitoreo SEO
