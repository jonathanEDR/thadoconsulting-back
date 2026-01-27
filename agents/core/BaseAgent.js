/**
 * BaseAgent - Clase base para todos los agentes del sistema
 * Proporciona funcionalidades comunes y estructura estándar
 */

import EventEmitter from 'events';
import logger from '../../utils/logger.js';

export class BaseAgent extends EventEmitter {
  constructor(name, description, capabilities = []) {
    super();
    
    this.id = `agent_${name.toLowerCase()}_${Date.now()}`;
    this.name = name;
    this.description = description;
    this.capabilities = capabilities;
    this.status = 'initialized';
    this.createdAt = new Date();
    this.lastActivity = new Date();
    
    // Métricas básicas
    this.metrics = {
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
    
    logger.info(`🤖 Agent ${this.name} initialized with ID: ${this.id}`);
  }

  /**
   * Activar el agente (implementar en clases hijas)
   */
  async activate() {
    try {
      this.status = 'active';
      this.lastActivity = new Date();
      
      logger.success(`✅ Agent ${this.name} activated successfully`);
      this.emit('agent:activated', { agentId: this.id, name: this.name });
      
      return { success: true, message: `Agent ${this.name} is now active` };
    } catch (error) {
      this.status = 'error';
      logger.error(`❌ Error activating agent ${this.name}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Desactivar el agente
   */
  async deactivate() {
    try {
      this.status = 'inactive';
      this.lastActivity = new Date();
      
      logger.info(`🔻 Agent ${this.name} deactivated`);
      this.emit('agent:deactivated', { agentId: this.id, name: this.name });
      
      return { success: true, message: `Agent ${this.name} is now inactive` };
    } catch (error) {
      logger.error(`❌ Error deactivating agent ${this.name}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Procesar una tarea (método principal - implementar en clases hijas)
   */
  async processTask(task, context = {}) {
    const startTime = Date.now();
    this.lastActivity = new Date();
    this.metrics.totalTasks++;

    try {
      logger.info(`🔄 Agent ${this.name} processing task: ${task.type || 'unknown'}`);
      
      // Validar que el agente puede manejar esta tarea
      if (!this.canHandle(task)) {
        throw new Error(`Agent ${this.name} cannot handle task type: ${task.type}`);
      }

      // Ejecutar la tarea (implementado en clases hijas)
      const result = await this.executeTask(task, context);
      
      // Actualizar métricas de éxito
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, true);
      
      logger.success(`✅ Agent ${this.name} completed task in ${responseTime}ms`);
      this.emit('task:completed', { 
        agentId: this.id, 
        task, 
        result, 
        responseTime 
      });

      return {
        success: true,
        result,
        responseTime,
        agentName: this.name,
        taskId: task.id || Date.now()
      };

    } catch (error) {
      // Actualizar métricas de fallo
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, false);
      
      logger.error(`❌ Agent ${this.name} failed task:`, error);
      this.emit('task:failed', { 
        agentId: this.id, 
        task, 
        error: error.message, 
        responseTime 
      });

      return {
        success: false,
        error: error.message,
        responseTime,
        agentName: this.name,
        taskId: task.id || Date.now()
      };
    }
  }

  /**
   * Verificar si el agente puede manejar una tarea
   */
  canHandle(task) {
    if (!task) return false;
    
    // Si no tiene tipo, asumir que es una tarea válida (comando directo)
    if (!task.type) return true; // ← FIX: Permitir tareas sin tipo explícito
    
    // Verificar capacidades
    const taskType = task.type.toLowerCase();
    
    // Siempre permitir comandos de lenguaje natural
    if (taskType.includes('natural_language') || taskType.includes('command')) {
      return true; // ← FIX: Todos los agentes pueden procesar lenguaje natural
    }
    
    return this.capabilities.some(capability => 
      capability.toLowerCase().includes(taskType) || 
      taskType.includes(capability.toLowerCase())
    );
  }

  /**
   * Ejecutar tarea específica (implementar en clases hijas)
   */
  async executeTask(task, context) {
    throw new Error(`executeTask method must be implemented in ${this.constructor.name}`);
  }

  /**
   * Obtener información del agente
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      capabilities: this.capabilities,
      status: this.status,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      metrics: {
        ...this.metrics,
        successRate: this.metrics.totalTasks > 0 ? 
          (this.metrics.successfulTasks / this.metrics.totalTasks * 100).toFixed(2) + '%' : '0%'
      }
    };
  }

  /**
   * Verificar salud del agente
   */
  async healthCheck() {
    return {
      healthy: this.status === 'active',
      status: this.status,
      lastActivity: this.lastActivity,
      uptime: Date.now() - this.createdAt.getTime(),
      metrics: this.metrics
    };
  }

  /**
   * Actualizar métricas de rendimiento
   */
  updateMetrics(responseTime, success) {
    if (success) {
      this.metrics.successfulTasks++;
    } else {
      this.metrics.failedTasks++;
    }

    // Mantener solo los últimos 100 tiempos de respuesta
    this.metrics.responseTimes.push(responseTime);
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }

    // Calcular tiempo promedio
    this.metrics.averageResponseTime = 
      this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
  }

  /**
   * Validar datos de entrada
   */
  validateInput(data, requiredFields = []) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid input data');
    }

    for (const field of requiredFields) {
      if (!(field in data) || data[field] === undefined || data[field] === null) {
        throw new Error(`Required field missing: ${field}`);
      }
    }

    return true;
  }

  /**
   * Formatear respuesta estándar
   */
  formatResponse(data, message = 'Task completed successfully') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      agentName: this.name,
      agentId: this.id
    };
  }

  /**
   * Formatear error estándar
   */
  formatError(error, message = 'Task failed') {
    return {
      success: false,
      message,
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
      agentName: this.name,
      agentId: this.id
    };
  }
}

export default BaseAgent;