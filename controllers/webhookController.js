import { Webhook } from 'svix';
import User from '../models/User.js';

/**
 * @desc    Webhook de Clerk para sincronizar usuarios
 * @route   POST /api/webhooks/clerk
 * @access  Public (pero verificado con firma de Clerk)
 */
export const clerkWebhook = async (req, res) => {
  try {
    // Obtener headers necesarios para verificación
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
            return res.status(500).json({
        success: false,
        message: 'Webhook secret not configured'
      });
    }

    // Obtener headers de la petición
    const svix_id = req.headers['svix-id'];
    const svix_timestamp = req.headers['svix-timestamp'];
    const svix_signature = req.headers['svix-signature'];

    // Verificar que tenemos todos los headers
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Svix headers'
      });
    }

    // Obtener el body raw (ya viene como string desde el middleware)
    const payload = req.rawBody || JSON.stringify(req.body);

    // Crear instancia de Webhook de Svix
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt;

    // Verificar la firma del webhook
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (err) {
            return res.status(400).json({
        success: false,
        message: 'Webhook verification failed'
      });
    }

    // El webhook está verificado, procesar el evento
    const { id, ...attributes } = evt.data;
    const eventType = evt.type;

    // Manejar diferentes tipos de eventos
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(id, attributes);
        break;

      case 'user.updated':
        await handleUserUpdated(id, attributes);
        break;

      case 'user.deleted':
        await handleUserDeleted(id);
        break;

      default:
        // Evento no soportado, ignorar silenciosamente
        break;
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Manejar creación de usuario
 */
async function handleUserCreated(clerkId, attributes) {
  try {
    // Obtener email del usuario
    const email = attributes.email_addresses?.[0]?.email_address || '';
    
    // Verificar si es el primer super admin basado en email
    const { DEFAULT_SUPER_ADMIN } = await import('../config/roles.js');
    const isDefaultSuperAdmin = email === DEFAULT_SUPER_ADMIN.email;
    
    // Verificar si ya existe algún super admin
    const existingSuperAdmin = await User.findOne({ 
      role: 'SUPER_ADMIN',
      isActive: true 
    });
    
    const userData = {
      clerkId,
      email,
      firstName: attributes.first_name || '',
      lastName: attributes.last_name || '',
      username: attributes.username || email.split('@')[0],
      profileImage: attributes.image_url || '',
      emailVerified: attributes.email_addresses?.[0]?.verification?.status === 'verified',
      // Asignar rol: Super Admin si es el email por defecto y no hay otros super admins
      role: (isDefaultSuperAdmin && !existingSuperAdmin) ? 'SUPER_ADMIN' : 'USER',
      clerkCreatedAt: new Date(attributes.created_at),
      clerkUpdatedAt: new Date(attributes.updated_at)
    };

    const user = await User.create(userData);
    
    // Log importante si se crea un super admin
    if (user.role === 'SUPER_ADMIN') {
      const logger = (await import('../utils/logger.js')).default;
      logger.success('Super Admin creado automáticamente via webhook', {
        email: user.email,
        clerkId: user.clerkId
      });
    }
    
    return user;
  } catch (error) {
        throw error;
  }
}

/**
 * Manejar actualización de usuario
 */
async function handleUserUpdated(clerkId, attributes) {
  try {
    // Solo actualizar datos de perfil de Clerk, NO el rol
    // El rol se mantiene en la base de datos y solo se cambia via API administrativa
    const updateData = {
      email: attributes.email_addresses?.[0]?.email_address || '',
      firstName: attributes.first_name || '',
      lastName: attributes.last_name || '',
      username: attributes.username || '',
      profileImage: attributes.image_url || '',
      emailVerified: attributes.email_addresses?.[0]?.verification?.status === 'verified',
      clerkUpdatedAt: new Date(attributes.updated_at)
      // IMPORTANTE: NO actualizar role, customPermissions, roleAssignedBy, etc.
    };

    const user = await User.findOneAndUpdate(
      { clerkId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      // Si el usuario no existe en nuestra DB, crearlo
      await handleUserCreated(clerkId, attributes);
    }

    return user;
  } catch (error) {
        throw error;
  }
}

/**
 * Manejar eliminación de usuario
 */
async function handleUserDeleted(clerkId) {
  try {
    const user = await User.findOneAndUpdate(
      { clerkId },
      { isActive: false },
      { new: true }
    );

    return user;
  } catch (error) {
        throw error;
  }
}
