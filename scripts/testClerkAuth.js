/**
 * 🔍 Script de Diagnóstico de Autenticación Clerk
 * Verifica configuración y valida tokens
 */

import 'dotenv/config';
import { verifyToken } from '@clerk/clerk-sdk-node';
import jwt from 'jsonwebtoken';

console.log('\n🔍 DIAGNÓSTICO DE AUTENTICACIÓN CLERK\n');
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Verificar variables de entorno
console.log('📋 PASO 1: Verificar Variables de Entorno');
console.log('─'.repeat(60));

const checks = {
  CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
  JWT_SECRET: !!process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV || 'not set'
};

console.log('✓ CLERK_SECRET_KEY:', checks.CLERK_SECRET_KEY ? '✅ Configurado' : '❌ FALTANTE');
console.log('  Valor:', process.env.CLERK_SECRET_KEY ? 
  `${process.env.CLERK_SECRET_KEY.substring(0, 15)}...` : 
  'No configurado');
console.log('  Prefijo esperado: sk_test_ (desarrollo) o sk_live_ (producción)');

console.log('\n✓ JWT_SECRET:', checks.JWT_SECRET ? '✅ Configurado' : '⚠️  No configurado (opcional)');
if (checks.JWT_SECRET) {
  console.log('  Valor:', `${process.env.JWT_SECRET.substring(0, 15)}...`);
}

console.log('\n✓ NODE_ENV:', checks.NODE_ENV);

// 2. Verificar formato de CLERK_SECRET_KEY
console.log('\n\n📋 PASO 2: Validar Formato de CLERK_SECRET_KEY');
console.log('─'.repeat(60));

if (process.env.CLERK_SECRET_KEY) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  
  if (secretKey.startsWith('sk_test_')) {
    console.log('✅ Formato correcto: Clave de desarrollo (sk_test_)');
  } else if (secretKey.startsWith('sk_live_')) {
    console.log('✅ Formato correcto: Clave de producción (sk_live_)');
  } else {
    console.log('❌ FORMATO INCORRECTO: La clave debe empezar con sk_test_ o sk_live_');
  }
  
  console.log('   Longitud:', secretKey.length, 'caracteres');
  console.log('   Prefijo:', secretKey.substring(0, 8));
} else {
  console.log('❌ CLERK_SECRET_KEY no está configurado');
}

// 3. Guía de solución
console.log('\n\n📋 PASO 3: Recomendaciones');
console.log('─'.repeat(60));

if (!checks.CLERK_SECRET_KEY) {
  console.log('\n❌ ERROR CRÍTICO: CLERK_SECRET_KEY no configurado\n');
  console.log('SOLUCIÓN:');
  console.log('1. Ve a https://dashboard.clerk.com');
  console.log('2. Selecciona tu aplicación');
  console.log('3. Ve a "API Keys" en el menú lateral');
  console.log('4. Copia el "Secret key" (empieza con sk_test_ o sk_live_)');
  console.log('5. Pégalo en tu archivo .env:');
  console.log('   CLERK_SECRET_KEY=sk_test_TuClaveAqui\n');
} else if (!process.env.CLERK_SECRET_KEY.startsWith('sk_')) {
  console.log('\n❌ ERROR: CLERK_SECRET_KEY tiene formato incorrecto\n');
  console.log('SOLUCIÓN:');
  console.log('1. Verifica que estás usando el "Secret key" correcto');
  console.log('2. NO uses el "Publishable key" (pk_...)');
  console.log('3. La clave debe empezar con sk_test_ o sk_live_\n');
} else {
  console.log('\n✅ Configuración parece correcta\n');
  console.log('SIGUIENTES PASOS:');
  console.log('1. Verifica en https://dashboard.clerk.com que tu app esté activa');
  console.log('2. Asegúrate de que el dominio localhost:5173 esté autorizado');
  console.log('3. Verifica que el frontend esté usando las claves correctas de Clerk\n');
}

// 4. Test de validación de token (si hay un token de ejemplo)
console.log('\n📋 PASO 4: Test de Validación de Token');
console.log('─'.repeat(60));
console.log('Para probar la validación, copia un token de tu navegador:');
console.log('1. Abre DevTools > Application > Session Storage');
console.log('2. Busca las claves de Clerk');
console.log('3. Ejecuta este script con: TOKEN="tu-token" node testClerkAuth.js\n');

if (process.env.TOKEN) {
  console.log('🧪 Probando validación de token...\n');
  
  try {
    const decoded = await verifyToken(process.env.TOKEN, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: 60000
    });
    
    console.log('✅ Token válido!');
    console.log('   Usuario ID:', decoded.sub);
    console.log('   Sesión ID:', decoded.sid);
    console.log('   Expiración:', new Date(decoded.exp * 1000).toLocaleString());
  } catch (error) {
    console.log('❌ Token inválido:');
    console.log('   Error:', error.message);
    console.log('\n   Posibles causas:');
    console.log('   - Token expirado');
    console.log('   - CLERK_SECRET_KEY incorrecto');
    console.log('   - Token de otra aplicación de Clerk');
  }
}

console.log('\n═══════════════════════════════════════════════════════════════\n');
console.log('✅ Diagnóstico completado\n');
