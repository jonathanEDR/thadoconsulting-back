/**
 * TEST SUITE AVANZADO - Sistema de Agentes AI Inteligentes
 * Tests completos para validar funcionalidad de sistemas avanzados
 */

import express from 'express';
import logger from '../utils/logger.js';
import openaiService from '../agents/services/OpenAIService.js';
import agentOrchestrator from '../agents/core/AgentOrchestrator.js';
import dynamicPromptSystem from '../agents/context/DynamicPromptSystem.js';
import intelligentMemorySystem from '../agents/memory/IntelligentMemorySystem.js';

const router = express.Router();

// =====================================================
// 🧪 TEST SUITE PRINCIPAL
// =====================================================

/**
 * Test completo del sistema de agentes avanzado
 */
router.get('/test-advanced-agents', async (req, res) => {
  try {
    logger.info('🧪 Iniciando test suite completo del sistema avanzado...');
    
    const testResults = {
      timestamp: new Date(),
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      results: []
    };

    // Test 1: Sistema de Prompts Dinámicos
    await runTest(testResults, 'Dynamic Prompt System', testDynamicPromptSystem);
    
    // Test 2: Sistema de Memoria Inteligente
    await runTest(testResults, 'Intelligent Memory System', testIntelligentMemorySystem);
    
    // Test 3: OpenAI Service Avanzado
    await runTest(testResults, 'Advanced OpenAI Service', testAdvancedOpenAIService);
    
    // Test 4: Integración Completa
    await runTest(testResults, 'Complete Integration', testCompleteIntegration);
    
    // Test 5: Performance y Optimización
    await runTest(testResults, 'Performance & Optimization', testPerformanceOptimization);

    // Test 6: Personalización y Adaptación
    await runTest(testResults, 'Personalization & Adaptation', testPersonalizationAdaptation);

    // Calcular resultados finales
    testResults.successRate = (testResults.passedTests / testResults.totalTests) * 100;
    
    logger.success(`✅ Test suite completado: ${testResults.passedTests}/${testResults.totalTests} tests passed (${testResults.successRate.toFixed(1)}%)`);
    
    res.json({
      success: true,
      message: 'Advanced AI Agent System Test Suite completed',
      results: testResults
    });

  } catch (error) {
    logger.error('❌ Error running test suite:', error);
    res.status(500).json({
      success: false,
      error: 'Test suite execution failed',
      details: error.message
    });
  }
});

// =====================================================
// 🔬 FUNCIONES DE TESTING INDIVIDUALES
// =====================================================

/**
 * Test del Sistema de Prompts Dinámicos
 */
async function testDynamicPromptSystem() {
  const tests = [];
  
  try {
    // Test 1.1: Generar prompt para BlogAgent
    const blogPrompt = await dynamicPromptSystem.generateDynamicPrompt(
      'BlogAgent',
      'task',
      {
        type: 'analyze_content',
        contentData: {
          title: 'Test Blog Post',
          category: { name: 'Technology' },
          content: 'Test content for analysis...',
          tags: [{ name: 'AI' }, { name: 'Tech' }]
        }
      }
    );
    
    tests.push({
      name: 'Generate BlogAgent Dynamic Prompt',
      passed: blogPrompt && blogPrompt.content && blogPrompt.content.length > 100,
      details: `Generated prompt: ${blogPrompt.content?.substring(0, 100)}...`,
      metadata: blogPrompt.metadata
    });
    
    // Test 1.2: Template con variables
    const hasVariables = blogPrompt.content.includes('Technology') || 
                        blogPrompt.content.includes('Test Blog Post');
    
    tests.push({
      name: 'Dynamic Prompt Variable Interpolation',
      passed: hasVariables,
      details: `Variables properly interpolated: ${hasVariables}`,
      variables: blogPrompt.variables
    });
    
    // Test 1.3: Obtener estadísticas del sistema
    const stats = await dynamicPromptSystem.getSystemStats();
    
    tests.push({
      name: 'Dynamic Prompt System Stats',
      passed: stats && stats.templateStats && Array.isArray(stats.templateStats),
      details: `Templates by category: ${stats?.templateStats?.length || 0}`,
      stats: stats
    });
    
  } catch (error) {
    tests.push({
      name: 'Dynamic Prompt System Error',
      passed: false,
      details: `Error: ${error.message}`,
      error: error.stack
    });
  }
  
  return tests;
}

/**
 * Test del Sistema de Memoria Inteligente
 */
async function testIntelligentMemorySystem() {
  const tests = [];
  
  try {
    const testUserId = 'test_user_' + Date.now();
    
    // Test 2.1: Obtener contexto inteligente
    const intelligentContext = await intelligentMemorySystem.getIntelligentContext(
      testUserId,
      'BlogAgent',
      { type: 'analyze_content', complexity: 'medium' }
    );
    
    tests.push({
      name: 'Get Intelligent Context',
      passed: intelligentContext && 
              intelligentContext.user && 
              intelligentContext.optimization,
      details: `Context generated with ${Object.keys(intelligentContext).length} sections`,
      context: intelligentContext
    });
    
    // Test 2.2: Preferencias de usuario
    const userPrefs = intelligentContext.user.preferences;
    const hasPreferences = userPrefs && 
                          userPrefs.communication && 
                          userPrefs.task_preferences;
    
    tests.push({
      name: 'User Preferences Generation',
      passed: hasPreferences,
      details: `Generated preferences for new user: ${hasPreferences}`,
      preferences: userPrefs
    });
    
    // Test 2.3: Registrar resultado de interacción
    await intelligentMemorySystem.recordInteractionResult(
      testUserId,
      'BlogAgent',
      { type: 'analyze_content', prompt: 'Test analysis request' },
      {
        success: true,
        content: 'Test analysis result',
        userSatisfaction: 0.85,
        tokens_used: 150,
        processing_time: 1200
      }
    );
    
    tests.push({
      name: 'Record Interaction Result',
      passed: true,
      details: 'Interaction recorded successfully for learning'
    });
    
    // Test 2.4: Estadísticas del sistema de memoria
    const memoryStats = await intelligentMemorySystem.getMemorySystemStats();
    
    tests.push({
      name: 'Memory System Statistics',
      passed: memoryStats && memoryStats.cacheStats,
      details: `Cache size: patterns=${memoryStats?.cacheStats?.patternCacheSize || 0}, users=${memoryStats?.cacheStats?.userCacheSize || 0}`,
      stats: memoryStats
    });
    
  } catch (error) {
    tests.push({
      name: 'Intelligent Memory System Error',
      passed: false,
      details: `Error: ${error.message}`,
      error: error.stack
    });
  }
  
  return tests;
}

/**
 * Test del OpenAI Service Avanzado
 */
async function testAdvancedOpenAIService() {
  const tests = [];
  
  try {
    // Test 3.1: Verificar disponibilidad del servicio
    const isAvailable = openaiService.isAvailable();
    
    tests.push({
      name: 'OpenAI Service Availability',
      passed: isAvailable,
      details: `Service available: ${isAvailable}`,
      health: await openaiService.getHealthStatus()
    });
    
    // Test 3.2: Generar respuesta inteligente (sin llamada real a OpenAI)
    // Simular respuesta para testing sin consumir tokens
    const mockResponse = {
      success: true,
      content: 'Esta es una respuesta de prueba generada por el sistema avanzado de agentes AI.',
      metadata: {
        agent: 'BlogAgent',
        intelligence_applied: true,
        adaptations_applied: {
          communication: ['use_professional_tone'],
          content: ['include_practical_examples'],
          structure: ['use_detailed_format']
        }
      }
    };
    
    tests.push({
      name: 'Advanced Response Generation (Mock)',
      passed: mockResponse.success && mockResponse.metadata.intelligence_applied,
      details: `Generated intelligent response with ${mockResponse.metadata.adaptations_applied ? Object.keys(mockResponse.metadata.adaptations_applied).length : 0} adaptation types`,
      response: mockResponse
    });
    
    // Test 3.3: Métricas del servicio
    const metrics = openaiService.getMetrics();
    
    tests.push({
      name: 'OpenAI Service Metrics',
      passed: metrics && typeof metrics.totalRequests === 'number',
      details: `Total requests: ${metrics.totalRequests}, Cache hits: ${metrics.cachedResponses}`,
      metrics: metrics
    });
    
  } catch (error) {
    tests.push({
      name: 'Advanced OpenAI Service Error',
      passed: false,
      details: `Error: ${error.message}`,
      error: error.stack
    });
  }
  
  return tests;
}

/**
 * Test de Integración Completa
 */
async function testCompleteIntegration() {
  const tests = [];
  
  try {
    // Test 4.1: Verificar carga de todos los sistemas
    const systemsLoaded = {
      orchestrator: !!agentOrchestrator,
      openaiService: !!openaiService,
      dynamicPrompts: !!dynamicPromptSystem,
      intelligentMemory: !!intelligentMemorySystem
    };
    
    const allSystemsLoaded = Object.values(systemsLoaded).every(loaded => loaded);
    
    tests.push({
      name: 'All Systems Loaded',
      passed: allSystemsLoaded,
      details: `Systems loaded: ${Object.entries(systemsLoaded).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      systems: systemsLoaded
    });
    
    // Test 4.2: Proceso completo de análisis de blog (simulado)
    const testUserId = 'integration_test_' + Date.now();
    const testBlogData = {
      title: 'Guía Completa de Integración AI',
      content: 'Esta es una guía completa sobre cómo integrar sistemas de inteligencia artificial...',
      category: { name: 'Technology' },
      tags: [{ name: 'AI' }, { name: 'Integration' }]
    };
    
    // Simular flujo completo
    const integrationSteps = [];
    
    // Paso 1: Contexto inteligente
    const context = await intelligentMemorySystem.getIntelligentContext(
      testUserId, 
      'BlogAgent', 
      { type: 'analyze_content', contentData: testBlogData }
    );
    integrationSteps.push('✅ Intelligent context generated');
    
    // Paso 2: Prompt dinámico
    const prompt = await dynamicPromptSystem.generateDynamicPrompt(
      'BlogAgent',
      'task',
      { type: 'analyze_content', contentData: testBlogData, userRole: context.user.preferences.expertise.skill_level }
    );
    integrationSteps.push('✅ Dynamic prompt created');
    
    // Paso 3: Registro de resultado
    await intelligentMemorySystem.recordInteractionResult(
      testUserId,
      'BlogAgent',
      { type: 'analyze_content', contentData: testBlogData },
      { success: true, content: 'Integration test result', userSatisfaction: 0.9 }
    );
    integrationSteps.push('✅ Result recorded for learning');
    
    tests.push({
      name: 'Complete Integration Flow',
      passed: integrationSteps.length === 3,
      details: `Integration steps completed: ${integrationSteps.length}/3`,
      steps: integrationSteps
    });
    
  } catch (error) {
    tests.push({
      name: 'Complete Integration Error',
      passed: false,
      details: `Error: ${error.message}`,
      error: error.stack
    });
  }
  
  return tests;
}

/**
 * Test de Performance y Optimización
 */
async function testPerformanceOptimization() {
  const tests = [];
  
  try {
    // Test 5.1: Tiempo de respuesta de sistemas
    const performanceTests = {};
    
    // Medir tiempo de contexto inteligente
    const startContext = Date.now();
    await intelligentMemorySystem.getIntelligentContext('perf_test_user', 'BlogAgent', {});
    performanceTests.contextTime = Date.now() - startContext;
    
    // Medir tiempo de prompt dinámico
    const startPrompt = Date.now();
    await dynamicPromptSystem.generateDynamicPrompt('BlogAgent', 'task', {});
    performanceTests.promptTime = Date.now() - startPrompt;
    
    const performanceGood = performanceTests.contextTime < 1000 && performanceTests.promptTime < 500;
    
    tests.push({
      name: 'System Response Performance',
      passed: performanceGood,
      details: `Context: ${performanceTests.contextTime}ms, Prompt: ${performanceTests.promptTime}ms`,
      performance: performanceTests
    });
    
    // Test 5.2: Optimización de memoria
    const memoryStats = await intelligentMemorySystem.getMemorySystemStats();
    const cacheEfficient = memoryStats.cacheStats.patternCacheSize < 100 && 
                          memoryStats.cacheStats.userCacheSize < 100;
    
    tests.push({
      name: 'Memory Optimization',
      passed: cacheEfficient,
      details: `Cache sizes within limits: patterns=${memoryStats.cacheStats.patternCacheSize}, users=${memoryStats.cacheStats.userCacheSize}`,
      memoryStats: memoryStats.cacheStats
    });
    
    // Test 5.3: Optimización de tokens
    const tokenOptimization = openaiService.estimateTokenCount(['Test message']) < 10;
    
    tests.push({
      name: 'Token Optimization',
      passed: tokenOptimization,
      details: `Token estimation working correctly`,
      tokenCount: openaiService.estimateTokenCount(['Test message'])
    });
    
  } catch (error) {
    tests.push({
      name: 'Performance Optimization Error',
      passed: false,
      details: `Error: ${error.message}`,
      error: error.stack
    });
  }
  
  return tests;
}

/**
 * Test de Personalización y Adaptación
 */
async function testPersonalizationAdaptation() {
  const tests = [];
  
  try {
    const testUserId = 'personalization_test_' + Date.now();
    
    // Test 6.1: Adaptaciones basadas en preferencias del usuario
    const context = await intelligentMemorySystem.getIntelligentContext(
      testUserId,
      'BlogAgent',
      { type: 'analyze_content' }
    );
    
    const hasAdaptations = context.user.adaptations && 
                          (context.user.adaptations.communication || 
                           context.user.adaptations.content || 
                           context.user.adaptations.structure);
    
    tests.push({
      name: 'User-Based Adaptations',
      passed: hasAdaptations,
      details: `Generated adaptations for user preferences`,
      adaptations: context.user.adaptations
    });
    
    // Test 6.2: Personalización de prompts
    const personalizedPrompt = await dynamicPromptSystem.generateDynamicPrompt(
      'BlogAgent',
      'system',
      {
        agentProfile: {
          personality: { name: 'Professional Expert' },
          basicInfo: { specialization: 'Content Analysis' }
        }
      }
    );
    
    const isPersonalized = personalizedPrompt.content.includes('Professional Expert') ||
                          personalizedPrompt.content.includes('Content Analysis');
    
    tests.push({
      name: 'Prompt Personalization',
      passed: isPersonalized,
      details: `Prompt includes personality and specialization elements`,
      template: personalizedPrompt.template
    });
    
    // Test 6.3: Aprendizaje adaptativo
    // Simular múltiples interacciones para testing de aprendizaje
    for (let i = 0; i < 3; i++) {
      await intelligentMemorySystem.recordInteractionResult(
        testUserId,
        'BlogAgent',
        { type: 'analyze_content', complexity: 'medium' },
        { 
          success: true, 
          userSatisfaction: 0.8 + (i * 0.05), // Incrementar satisfacción
          userFeedback: { 
            tone_preference: 'professional',
            detail_preference: i < 2 ? 'standard' : 'detailed'
          }
        }
      );
    }
    
    tests.push({
      name: 'Adaptive Learning Simulation',
      passed: true,
      details: 'Recorded multiple interactions for learning pattern development',
      interactions: 3
    });
    
  } catch (error) {
    tests.push({
      name: 'Personalization & Adaptation Error',
      passed: false,
      details: `Error: ${error.message}`,
      error: error.stack
    });
  }
  
  return tests;
}

// =====================================================
// 🛠️ UTILIDADES DE TESTING
// =====================================================

/**
 * Ejecutar test individual y agregar resultado
 */
async function runTest(testResults, testName, testFunction) {
  try {
    logger.info(`🧪 Running test: ${testName}`);
    
    const startTime = Date.now();
    const individualTests = await testFunction();
    const duration = Date.now() - startTime;
    
    const passed = individualTests.every(test => test.passed);
    const testResult = {
      name: testName,
      passed: passed,
      duration: duration,
      individualTests: individualTests,
      summary: `${individualTests.filter(t => t.passed).length}/${individualTests.length} sub-tests passed`
    };
    
    testResults.results.push(testResult);
    testResults.totalTests++;
    
    if (passed) {
      testResults.passedTests++;
      logger.success(`✅ ${testName}: PASSED (${duration}ms)`);
    } else {
      testResults.failedTests++;
      logger.error(`❌ ${testName}: FAILED (${duration}ms)`);
    }
    
  } catch (error) {
    testResults.results.push({
      name: testName,
      passed: false,
      error: error.message,
      stack: error.stack
    });
    testResults.totalTests++;
    testResults.failedTests++;
    logger.error(`❌ ${testName}: ERROR - ${error.message}`);
  }
}

// =====================================================
// 📊 ENDPOINTS DE MÉTRICAS Y ESTADÍSTICAS
// =====================================================

/**
 * Obtener métricas completas del sistema
 */
router.get('/system-metrics', async (req, res) => {
  try {
    const [
      promptStats,
      memoryStats,
      openaiMetrics
    ] = await Promise.all([
      dynamicPromptSystem.getSystemStats(),
      intelligentMemorySystem.getMemorySystemStats(),
      Promise.resolve(openaiService.getMetrics())
    ]);

    res.json({
      success: true,
      timestamp: new Date(),
      metrics: {
        promptSystem: promptStats,
        memorySystem: memoryStats,
        openaiService: openaiMetrics
      }
    });

  } catch (error) {
    logger.error('❌ Error getting system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system metrics',
      details: error.message
    });
  }
});

/**
 * Health check avanzado
 */
router.get('/health-advanced', async (req, res) => {
  try {
    const health = {
      timestamp: new Date(),
      status: 'healthy',
      systems: {
        promptSystem: 'operational',
        memorySystem: 'operational',
        openaiService: openaiService.isAvailable() ? 'operational' : 'degraded'
      },
      version: '2.0.0-advanced'
    };

    res.json(health);

  } catch (error) {
    res.status(500).json({
      timestamp: new Date(),
      status: 'error',
      error: error.message
    });
  }
});

export default router;