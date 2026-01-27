import Lead from '../models/Lead.js';
import logger from './logger.js';

/**
 * Vincula automáticamente un usuario recién registrado con leads existentes
 * basándose en coincidencias de email
 * 
 * @param {Object} userData - Datos del usuario recién creado
 * @param {string} userData.clerkId - ID de Clerk del usuario
 * @param {string} userData.email - Email del usuario
 * @param {string} userData.firstName - Nombre del usuario
 * @param {string} userData.lastName - Apellido del usuario
 * @param {string} userData.role - Rol del usuario (CLIENT, etc.)
 * @returns {Promise<Object>} Resultado de la vinculación
 */
export const autoLinkUserToLeads = async (userData) => {
  try {
    const { clerkId, email, firstName, lastName, role } = userData;
    
    // Solo vincular usuarios CLIENT automáticamente
    if (role !== 'CLIENT') {
      return {
        success: true,
        message: 'Usuario no es CLIENT, no se requiere vinculación automática',
        leadsLinked: 0
      };
    }

    logger.info('Iniciando vinculación automática de leads', {
      clerkId,
      email,
      role
    });

    // Buscar leads que coincidan con el email del usuario
    const matchingLeads = await Lead.find({
      $and: [
        {
          $or: [
            { email: email },
            { correo: email }
          ]
        },
        {
          $or: [
            { 'usuarioRegistrado.userId': { $exists: false } },
            { 'usuarioRegistrado.userId': null },
            { 'usuarioRegistrado.userId': '' }
          ]
        }
      ]
    });

    logger.debug('Leads encontrados para vinculación', {
      email,
      leadsFound: matchingLeads.length
    });

    if (matchingLeads.length === 0) {
      return {
        success: true,
        message: 'No se encontraron leads sin vincular para este email',
        leadsLinked: 0
      };
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const linkedLeads = [];

    // Vincular cada lead encontrado
    for (const lead of matchingLeads) {
      lead.usuarioRegistrado = {
        userId: clerkId,
        nombre: fullName,
        email: email,
        vinculadoEn: new Date(),
        vinculadoPor: {
          userId: 'system',
          nombre: 'Sistema Automático'
        }
      };

      // Asegurar que el lead tenga el email correcto
      if (!lead.email && !lead.correo) {
        lead.email = email;
      }

      await lead.save();
      linkedLeads.push({
        id: lead._id.toString(),
        nombre: lead.nombre
      });

      logger.success('Lead vinculado automáticamente', {
        leadId: lead._id.toString(),
        leadName: lead.nombre,
        userEmail: email
      });
    }

    return {
      success: true,
      message: `${linkedLeads.length} lead(s) vinculado(s) automáticamente`,
      leadsLinked: linkedLeads.length,
      linkedLeads
    };

  } catch (error) {
    logger.error('Error en vinculación automática de leads', {
      error: error.message,
      stack: error.stack,
      userData: {
        clerkId: userData.clerkId,
        email: userData.email
      }
    });

    return {
      success: false,
      message: 'Error en vinculación automática',
      error: error.message,
      leadsLinked: 0
    };
  }
};

/**
 * Crea un nuevo lead vinculado automáticamente al usuario registrado
 * Se usa cuando no existen leads previos para el email del usuario
 * 
 * @param {Object} userData - Datos del usuario
 * @returns {Promise<Object>} Resultado de la creación del lead
 */
export const createLinkedLeadForUser = async (userData) => {
  try {
    const { clerkId, email, firstName, lastName } = userData;
    
    const fullName = `${firstName} ${lastName}`.trim();
    
    const newLead = new Lead({
      nombre: fullName,
      email: email,
      correo: email,
      telefono: '', // Se puede completar después
      empresa: '', // Se puede completar después
      tipoServicio: 'consulta',
      descripcionProyecto: 'Lead creado automáticamente al registrarse como usuario',
      estado: 'nuevo',
      prioridad: 'media',
      origen: 'registro_usuario',
      usuarioRegistrado: {
        userId: clerkId,
        nombre: fullName,
        email: email,
        vinculadoEn: new Date(),
        vinculadoPor: {
          userId: 'system',
          nombre: 'Sistema Automático'
        }
      },
      creadoPor: {
        userId: 'system',
        nombre: 'Sistema Automático'
      },
      actividades: [{
        fecha: new Date(),
        tipo: 'nota',
        descripcion: 'Lead creado automáticamente al registrar usuario en el sistema',
        usuarioId: 'system',
        usuarioNombre: 'Sistema Automático',
        esPrivado: false,
        direccion: 'interno'
      }]
    });

    await newLead.save();

    logger.success('Nuevo lead creado y vinculado automáticamente', {
      leadId: newLead._id.toString(),
      leadName: newLead.nombre,
      userEmail: email
    });

    return {
      success: true,
      message: 'Nuevo lead creado y vinculado automáticamente',
      leadCreated: true,
      lead: {
        id: newLead._id.toString(),
        nombre: newLead.nombre,
        email: newLead.email
      }
    };

  } catch (error) {
    logger.error('Error creando lead vinculado automáticamente', {
      error: error.message,
      stack: error.stack,
      userData: {
        clerkId: userData.clerkId,
        email: userData.email
      }
    });

    return {
      success: false,
      message: 'Error creando lead automático',
      error: error.message,
      leadCreated: false
    };
  }
};