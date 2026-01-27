/**
 * Endpoint de prueba para verificar configuración del BlogAgent
 */

import AgentOrchestrator from '../agents/core/AgentOrchestrator.js';
import logger from '../utils/logger.js';

/**
 * GET /api/agents/test/config
 * Probar configuración actual del BlogAgent
 */
export const testAgentConfiguration = async (req, res) => {
  try {
    logger.info('🧪 Testing BlogAgent configuration via API...');
    
    // Obtener el BlogAgent del orquestador
    const blogAgent = AgentOrchestrator.agents.get('BlogAgent');
    
    if (!blogAgent) {
      return res.status(404).json({
        success: false,
        error: 'BlogAgent not found in orchestrator',
        agents_available: Array.from(AgentOrchestrator.agents.keys())
      });
    }
    
    // Recopilar información de configuración
    const configInfo = {
      basic_config: {
        temperature: blogAgent.config.temperature,
        maxTokens: blogAgent.config.maxTokens,
        maxTagsPerPost: blogAgent.config.maxTagsPerPost,
        seoScoreThreshold: blogAgent.config.seoScoreThreshold,
        autoOptimization: blogAgent.config.autoOptimization
      },
      advanced_config_available: !!blogAgent.advancedConfig,
      personality: blogAgent.advancedConfig?.personality || null,
      context: blogAgent.advancedConfig?.contextConfig || null,
      response_config: blogAgent.advancedConfig?.responseConfig || null
    };
    
    // Probar generación de prompt personalizado
    const testPrompt = 'Analiza este contenido de blog sobre inteligencia artificial y proporciona recomendaciones SEO';
    const personalizedPrompt = blogAgent.buildPersonalizedPrompt(testPrompt, 'content_analysis');
    
    // Probar configuración de OpenAI
    const openaiConfig = blogAgent.getOpenAIConfig();
    
    logger.success('✅ BlogAgent configuration tested successfully');
    
    res.json({
      success: true,
      data: {
        agent_id: blogAgent.id,
        agent_name: blogAgent.name,
        configuration: configInfo,
        openai_config: openaiConfig,
        personalized_prompt_preview: personalizedPrompt.substring(0, 500) + '...',
        test_timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('❌ Error testing BlogAgent configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};