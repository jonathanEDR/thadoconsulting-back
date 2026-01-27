/**
 * EventAgent - Agente especializado en gestión de eventos y calendario
 * 
 * RESPONSABILIDADES:
 * - Mostrar eventos del usuario
 * - Filtrar eventos por fecha
 * - Próximos eventos
 * - Gestión de calendario
 */

import BaseAgent from '../core/BaseAgent.js';
import AgentConfig from '../../models/AgentConfig.js';
import Event from '../../models/Event.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

export class EventAgent extends BaseAgent {
  constructor() {
    super(
      'EventAgent',
      'Agente especializado en gestión de eventos y calendario',
      [
        'event_management',
        'calendar_view',
        'event_listing',
        'event_filtering',
        'schedule_management'
      ]
    );

    this.config = {
      maxTokens: 1500,
      temperature: 0.7,
      personality: 'helpful',
      responseFormat: 'structured'
    };
  }

  /**
   * Cargar configuración desde la base de datos
   */
  async loadConfiguration() {
    try {
      const config = await AgentConfig.findOne({ agentName: 'EventAgent' });
      
      if (config) {
        this.config = {
          ...this.config,
          maxTokens: config.behaviorConfig?.maxTokens || this.config.maxTokens,
          temperature: config.behaviorConfig?.temperature || this.config.temperature,
          ...config.behaviorConfig
        };
        logger.success('✅ EventAgent configuration loaded from database');
      }
    } catch (error) {
      logger.error('Error loading EventAgent configuration:', error);
    }
  }

  /**
   * Ejecutar tarea específica
   */
  async executeTask(task, context = {}) {
    const { type, command, userId, clerkId } = task;

    try {
      // Si es comando de lenguaje natural, determinamos la acción
      if (type === 'natural_language_command' || command) {
        const action = this.determineAction(command || task.message);
        const commandLower = (command || task.message || '').toLowerCase();

        logger.info(`🗓️ EventAgent routing action: ${action} para comando: "${commandLower.substring(0, 50)}..."`);

        switch (action) {
          case 'list_events':
            return await this.handleListEvents(task, context);
          
          case 'today_events':
            return await this.handleTodayEvents(task, context);
          
          case 'upcoming_events':
            return await this.handleUpcomingEvents(task, context);
          
          default:
            return {
              success: false,
              message: 'No entendí qué quieres hacer con los eventos. Intenta: "mostrar eventos", "eventos de hoy", o "próximos eventos"'
            };
        }
      }

      throw new Error(`Tipo de tarea no soportado: ${type}`);

    } catch (error) {
      logger.error('❌ Error in EventAgent.executeTask:', error);
      throw error;
    }
  }

  /**
   * Determinar acción basada en el comando
   */
  determineAction(command) {
    const commandLower = command.toLowerCase();

    // Eventos de hoy
    if (commandLower.includes('hoy') || commandLower.includes('today')) {
      return 'today_events';
    }

    // Próximos eventos
    if (commandLower.includes('próxim') || commandLower.includes('proxim') || 
        commandLower.includes('siguiente') || commandLower.includes('upcoming')) {
      return 'upcoming_events';
    }

    // Listar todos los eventos
    if (commandLower.includes('mostrar') || commandLower.includes('ver') || 
        commandLower.includes('list') || commandLower.includes('eventos')) {
      return 'list_events';
    }

    return 'list_events'; // Default
  }

  /**
   * Listar todos los eventos del usuario
   */
  async handleListEvents(task, context) {
    try {
      const { userId, clerkId } = task;
      
      logger.info(`🔍 EventAgent.handleListEvents - Buscando usuario con:`, {
        userId,
        clerkId,
        taskKeys: Object.keys(task)
      });
      
      // Buscar usuario en MongoDB
      const user = await User.findOne({ clerkId: clerkId || userId });
      
      if (!user) {
        logger.error(`❌ Usuario no encontrado con clerkId: ${clerkId || userId}`);
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      logger.info(`📅 Buscando eventos para usuario: ${user._id}`);

      // Obtener eventos del usuario
      const events = await Event.find({
        $or: [
          { organizer: user._id },
          { 'attendees.user': user._id }
        ],
        status: { $ne: 'cancelled' }
      })
      .sort({ startDate: 1 })
      .limit(50)
      .populate('organizer', 'firstName lastName email')
      .lean();

      logger.info(`✅ Encontrados ${events.length} eventos`);

      if (events.length === 0) {
        return {
          success: true,
          message: 'No tienes eventos programados aún.',
          canvas_data: {
            type: 'empty_state',
            mode: 'info',
            data: {
              icon: '📅',
              title: 'Sin eventos',
              message: 'No hay eventos en tu calendario'
            }
          }
        };
      }

      // Formatear eventos para el canvas
      return {
        success: true,
        message: `Encontré ${events.length} evento${events.length !== 1 ? 's' : ''} en tu calendario.`,
        canvas_data: {
          type: 'event_list',
          mode: 'list',
          title: 'Mis Eventos',
          data: {
            events: events.map(event => this.formatEventForDisplay(event)),
            totalCount: events.length
          },
          metadata: {
            agent: 'EventAgent',
            action: 'list_events',
            timestamp: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      logger.error('❌ Error listing events:', error);
      return {
        success: false,
        message: 'Hubo un error al obtener tus eventos',
        error: error.message
      };
    }
  }

  /**
   * Eventos de hoy
   */
  async handleTodayEvents(task, context) {
    try {
      const { userId, clerkId } = task;
      
      const user = await User.findOne({ clerkId: clerkId || userId });
      
      if (!user) {
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      // Obtener inicio y fin del día
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const events = await Event.find({
        $or: [
          { organizer: user._id },
          { 'attendees.user': user._id }
        ],
        status: { $ne: 'cancelled' },
        startDate: {
          $gte: today,
          $lt: tomorrow
        }
      })
      .sort({ startDate: 1 })
      .populate('organizer', 'firstName lastName email')
      .lean();

      logger.info(`✅ Encontrados ${events.length} eventos para hoy`);

      if (events.length === 0) {
        return {
          success: true,
          message: 'No tienes eventos programados para hoy.',
          canvas_data: {
            type: 'empty_state',
            mode: 'info',
            data: {
              icon: '📅',
              title: 'Sin eventos hoy',
              message: 'No hay eventos en tu calendario para hoy'
            }
          }
        };
      }

      return {
        success: true,
        message: `Tienes ${events.length} evento${events.length !== 1 ? 's' : ''} hoy.`,
        canvas_data: {
          type: 'event_list',
          mode: 'list',
          title: 'Eventos de Hoy',
          data: {
            events: events.map(event => this.formatEventForDisplay(event)),
            totalCount: events.length,
            date: today.toISOString()
          },
          metadata: {
            agent: 'EventAgent',
            action: 'today_events',
            timestamp: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      logger.error('❌ Error getting today events:', error);
      return {
        success: false,
        message: 'Hubo un error al obtener los eventos de hoy',
        error: error.message
      };
    }
  }

  /**
   * Próximos eventos (próximos 7 días)
   */
  async handleUpcomingEvents(task, context) {
    try {
      const { userId, clerkId } = task;
      
      const user = await User.findOne({ clerkId: clerkId || userId });
      
      if (!user) {
        return {
          success: false,
          message: 'Usuario no encontrado'
        };
      }

      // Próximos 7 días
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const events = await Event.find({
        $or: [
          { organizer: user._id },
          { 'attendees.user': user._id }
        ],
        status: { $ne: 'cancelled' },
        startDate: {
          $gte: today,
          $lte: nextWeek
        }
      })
      .sort({ startDate: 1 })
      .populate('organizer', 'firstName lastName email')
      .lean();

      logger.info(`✅ Encontrados ${events.length} próximos eventos`);

      if (events.length === 0) {
        return {
          success: true,
          message: 'No tienes eventos próximos en los próximos 7 días.',
          canvas_data: {
            type: 'empty_state',
            mode: 'info',
            data: {
              icon: '📅',
              title: 'Sin eventos próximos',
              message: 'No hay eventos en los próximos 7 días'
            }
          }
        };
      }

      return {
        success: true,
        message: `Tienes ${events.length} evento${events.length !== 1 ? 's' : ''} próximo${events.length !== 1 ? 's' : ''}.`,
        canvas_data: {
          type: 'event_list',
          mode: 'list',
          title: 'Próximos Eventos (7 días)',
          data: {
            events: events.map(event => this.formatEventForDisplay(event)),
            totalCount: events.length,
            dateRange: {
              from: today.toISOString(),
              to: nextWeek.toISOString()
            }
          },
          metadata: {
            agent: 'EventAgent',
            action: 'upcoming_events',
            timestamp: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      logger.error('❌ Error getting upcoming events:', error);
      return {
        success: false,
        message: 'Hubo un error al obtener los próximos eventos',
        error: error.message
      };
    }
  }

  /**
   * Formatear evento para visualización
   */
  formatEventForDisplay(event) {
    return {
      id: event._id.toString(),
      title: event.title,
      description: event.description || '',
      type: event.type,
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate,
      allDay: event.allDay || false,
      location: event.location || {},
      status: event.status,
      priority: event.priority,
      organizer: event.organizer ? {
        name: `${event.organizer.firstName} ${event.organizer.lastName}`,
        email: event.organizer.email
      } : null,
      attendees: event.attendees?.length || 0,
      hasReminder: event.reminders && event.reminders.length > 0
    };
  }
}

// Exportar instancia única
const eventAgent = new EventAgent();
export default eventAgent;
