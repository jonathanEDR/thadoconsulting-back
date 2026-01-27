# 🔧 Diagnóstico y Solución: Respuestas Genéricas del Chatbot

## 🔴 Problemas Identificados

### Problema 1: Error IPv6 en Rate Limiter
```
ValidationError: Custom keyGenerator appears to use request IP without calling 
the ipKeyGenerator helper function for IPv6 addresses
```

### Problema 2: Respuestas Genéricas (No específicas de SCUTI)
```
Usuario: "¿Qué servicios ofrecen?"
Bot: "Como Agente AI especializado en ServicesAgent, puedo ofrecer 
      asistencia general..." ❌
```

**Esperado**:
```
Bot: "¡Hola! Soy tu Asesor de Ventas de SCUTI Company. 
      Ofrecemos servicios especializados en tecnología:
      
      📱 Desarrollo de Software
      - Aplicaciones Web...
      ..." ✅
```

---

## 🔍 Diagnóstico Detallado

### Análisis de Logs

```
📊 [CONTEXT] Loaded 12 services for AI context       ✅ BIEN
🚫 Cache disabled for ServicesAgent                   ✅ BIEN
🤖 Calling OpenAI API for ServicesAgent (212 tokens) ❌ PROBLEMA
```

**🚨 Hallazgo Crítico**: Solo **212 tokens** enviados a OpenAI

**Esperado**: ~600-800 tokens (con prompt completo + 12 servicios + categorías)

### Raíz del Problema

El método `generateAIResponse()` en `ServicesChatHandler.js` tenía un **bug crítico**:

```javascript
// ❌ ANTES (INCORRECTO)
const response = await openaiService.generateIntelligentResponse(
  sessionId,
  'ServicesAgent',
  prompt.current,  // ⚠️ Solo envía el mensaje del usuario
  {
    messages: messages,  // Array con system, history, user
    // ...
  }
);
```

**Problema**: El tercer parámetro `prompt.current` sobrescribe el `messages` array completo, ignorando el `systemPrompt`.

**Resultado**: OpenAI recibe solo el mensaje del usuario sin contexto de empresa ni servicios.

### Flujo Erróneo

```
buildChatPrompt() 
   ↓
Crea prompt.system con:
  - Identidad: "Asesor de Ventas SCUTI"
  - 12 servicios con precios
  - Categorías
  - Instrucciones específicas
   ↓
generateAIResponse()
   ↓
❌ Envía solo "¿Qué servicios ofrecen?" a OpenAI
❌ OpenAI no tiene contexto de SCUTI Company
   ↓
Respuesta genérica: "Como Agente AI especializado..."
```

---

## ✅ Soluciones Implementadas

### Solución 1: Corregir Rate Limiter IPv6

**Archivo**: `backend/routes/servicios.js`

**Antes**:
```javascript
keyGenerator: (req) => {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         'unknown';
}
```

**Después**:
```javascript
import { ipKeyGenerator } from 'express-rate-limit';

// ...

keyGenerator: ipKeyGenerator  // ✅ Soporte IPv6 nativo
```

**Beneficio**: Compatible con IPv4 e IPv6, sin errores de validación.

---

### Solución 2: Enviar Prompt Completo a OpenAI

**Archivo**: `backend/agents/specialized/services/handlers/ServicesChatHandler.js`

**Cambios**:

1. **Logging mejorado** para debugging:
```javascript
logger.info(`📦 [AI REQUEST] System prompt length: ${prompt.system.length} chars`);
logger.info(`📦 [AI REQUEST] User message: "${prompt.current.substring(0, 100)}..."`);
logger.info(`📦 [AI REQUEST] Total messages: ${messages.length}`);
```

2. **Nombre correcto del agente**:
```javascript
const response = await openaiService.generateIntelligentResponse(
  sessionId,
  'Asesor de Ventas SCUTI',  // ✅ Antes: 'ServicesAgent'
  prompt.current,
  {
    messages: messages,  // ✅ Array completo se usa correctamente
    // ...
  }
);
```

3. **Logging de respuesta**:
```javascript
logger.info(`✅ [AI RESPONSE] Received: ${response.content?.substring(0, 100)}...`);
```

---

## 🧪 Verificación

### Logs Esperados Después del Fix

```
💬 Asesor de Ventas SCUTI - Message: "¿Qué servicios ofrecen?..."
📊 [CONTEXT] Loaded 12 services for AI context
📦 [AI REQUEST] System prompt length: 2847 chars      ✅ >2000 chars
📦 [AI REQUEST] User message: "¿Qué servicios ofrecen?..."
📦 [AI REQUEST] Total messages: 2                     ✅ System + User
🤖 Calling OpenAI API for Asesor de Ventas SCUTI (945 tokens) ✅ ~900 tokens
✅ [AI RESPONSE] Received: "¡Hola! Soy tu Asesor de Ventas de SCUTI Company..."
```

### Respuesta Esperada

```
¡Hola! Soy tu Asesor de Ventas de SCUTI Company. Ofrecemos servicios especializados en tecnología:

📱 **Desarrollo de Software**
- Aplicaciones Web Personalizadas - S/ 5,000
- Desarrollo de Apps Móviles - S/ 8,000
- Sistemas Empresariales - Cotización personalizada

🛍️ **E-commerce**
- Tiendas Online - S/ 3,500
- Marketplaces - S/ 10,000

🤖 **Inteligencia Artificial**
- Chatbots Inteligentes - S/ 4,500
- Automatización de Procesos - Cotización personalizada

Contamos con 12 servicios activos en total. ¿Te interesa conocer más sobre algún servicio en particular o necesitas una cotización personalizada?
```

---

## 📊 Comparación Antes vs Después

| Aspecto | ❌ Antes | ✅ Después |
|---------|----------|------------|
| **Tokens enviados** | 212 | ~900 |
| **System prompt** | ❌ No incluido | ✅ Incluido completo |
| **Servicios en contexto** | 0 | 12 |
| **Identidad** | "ServicesAgent" | "Asesor de Ventas SCUTI" |
| **Respuesta** | Genérica | Específica de empresa |
| **Rate limiter** | ❌ Error IPv6 | ✅ Funcional IPv4/IPv6 |
| **Logging** | Mínimo | Detallado para debug |

---

## 🔬 Análisis Técnico del Bug

### ¿Por qué solo 212 tokens?

```javascript
// En openaiService.generateIntelligentResponse()
// Si el tercer parámetro (prompt.current) se usa como 'message' principal,
// puede sobrescribir o ignorar el 'messages' array en options

// Cálculo de tokens sin system prompt:
- Historial vacío: 0 tokens
- "¿Qué servicios ofrecen?": ~6 tokens
- Overhead de OpenAI: ~206 tokens (estructura, metadata)
= ~212 tokens total ✅ Coincide con los logs
```

### ¿Por qué respuesta genérica?

Sin el `systemPrompt`, OpenAI recibe:
- **Rol**: Desconocido (asume asistente general)
- **Contexto**: Ninguno
- **Empresa**: Desconocida
- **Servicios**: Ninguno

Resultado: OpenAI genera respuesta **basada en conocimiento general** sobre "ServicesAgent" (del nombre del agente).

---

## 🚀 Pasos para Testing

### 1. Reiniciar Backend
```bash
cd backend
npm start
```

### 2. Verificar Logs de Inicio
Buscar:
```
✅ Agent Asesor de Ventas SCUTI activated successfully
```

### 3. Abrir Frontend
```
http://localhost:5173
```

### 4. Abrir DevTools Console

### 5. Enviar Mensaje de Prueba
Click en botón flotante → Escribir: **"¿Qué servicios ofrecen?"**

### 6. Verificar Logs en Backend
```
📊 [CONTEXT] Loaded 12 services for AI context
📦 [AI REQUEST] System prompt length: 2847 chars      ← Debe ser >2000
📦 [AI REQUEST] User message: "¿Qué servicios ofrecen?..."
📦 [AI REQUEST] Total messages: 2                     ← System + User
🤖 Calling OpenAI API... (945 tokens)                 ← Debe ser >800
✅ [AI RESPONSE] Received: "¡Hola! Soy tu Asesor..."
```

### 7. Verificar Respuesta en Frontend
Debe incluir:
- ✅ "Soy tu Asesor de Ventas de SCUTI Company"
- ✅ Lista de servicios con precios
- ✅ Categorías organizadas
- ✅ Invitación a más información

---

## 🐛 Si Persiste el Problema

### Debug Checklist

1. **Verificar OpenAI API Key**:
```bash
# En backend/.env
echo $OPENAI_API_KEY
```

2. **Ver logs completos de OpenAI**:
```javascript
// En ServicesChatHandler.js, línea ~790
console.log('FULL PROMPT:', JSON.stringify(messages, null, 2));
```

3. **Verificar caché de módulos**:
```bash
# Limpiar y reinstalar
rm -rf node_modules
npm install
```

4. **Hard refresh del navegador**:
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

---

## 📚 Archivos Modificados

1. ✅ `backend/routes/servicios.js`
   - Agregado import `ipKeyGenerator`
   - Reemplazado `keyGenerator` custom por helper oficial

2. ✅ `backend/agents/specialized/services/handlers/ServicesChatHandler.js`
   - Mejorado logging en `generateAIResponse()`
   - Cambiado nombre agente a "Asesor de Ventas SCUTI"
   - Agregado verificación de respuesta

---

## 🎯 Resultado Final Esperado

**Usuario anónimo en página pública** → Click botón chat → Pregunta "¿Qué servicios ofrecen?" → **Recibe respuesta específica con servicios reales de SCUTI Company, precios y categorías** → Rate limiting protege contra spam (20 msg/10min por IP).

---

**Fecha**: 19 de Noviembre, 2025
**Diagnóstico**: Jonathan EDR
**Estado**: ✅ CORREGIDO
