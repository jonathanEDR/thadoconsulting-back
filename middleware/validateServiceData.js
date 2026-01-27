/**
 * Middleware de validación para servicios
 * Valida y sanitiza datos antes de llegar al controlador
 */

import Joi from 'joi';
import logger from '../utils/logger.js';

// Schema de validación para actualización de servicios
const updateServiceSchema = Joi.object({
  // Campos básicos
  titulo: Joi.string().trim().max(100).optional(),
  descripcion: Joi.string().max(1000).optional(),
  descripcionCorta: Joi.string().max(200).optional(),
  
  // Contenido avanzado
  descripcionRica: Joi.string().max(5000).allow('').optional(),
  videoUrl: Joi.string().pattern(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/).allow('').optional(),
  galeriaImagenes: Joi.array().items(Joi.string().uri()).max(10).optional(),
  contenidoAdicional: Joi.string().max(2000).allow('').optional(),
  
  // Pricing - ✅ CORREGIDO: Permitir null y undefined para precio
  precio: Joi.number().min(0).allow(null).optional(),
  precioMin: Joi.number().min(0).allow(null).optional(),
  precioMax: Joi.number().min(0).allow(null).optional(),
  tipoPrecio: Joi.string().valid('fijo', 'rango', 'paquetes', 'personalizado', 'suscripcion').optional(),
  moneda: Joi.string().valid('USD', 'MXN', 'EUR', 'PEN').optional(),
  
  // Arrays
  caracteristicas: Joi.array().items(Joi.string().trim()).optional(),
  beneficios: Joi.array().items(Joi.string().trim()).optional(),
  incluye: Joi.array().items(Joi.string().trim()).optional(),
  noIncluye: Joi.array().items(Joi.string().trim()).optional(),
  etiquetas: Joi.array().items(Joi.string().trim().lowercase()).optional(),
  tecnologias: Joi.array().items(Joi.string().trim()).optional(),
  
  // FAQ
  faq: Joi.array().items(
    Joi.object({
      pregunta: Joi.string().required(),
      respuesta: Joi.string().required()
    })
  ).optional(),
  
  // SEO
  seo: Joi.object({
    titulo: Joi.string().max(60).allow('').optional(),
    descripcion: Joi.string().max(160).allow('').optional(),
    palabrasClave: Joi.string().max(500).allow('').optional()
  }).optional(),
  
  // Estado y configuración
  estado: Joi.string().valid('activo', 'desarrollo', 'pausado', 'descontinuado', 'agotado').optional(),
  activo: Joi.boolean().optional(),
  visibleEnWeb: Joi.boolean().optional(),
  destacado: Joi.boolean().optional(),
  requiereContacto: Joi.boolean().optional(),
  
  // Campos de gestión
  categoria: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(), // ObjectId válido
  responsable: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  departamento: Joi.string().valid('ventas', 'desarrollo', 'marketing', 'diseño', 'soporte').optional(),
  soporte: Joi.string().valid('basico', 'premium', 'dedicado', '24x7').optional(),
  
  // Duración
  duracion: Joi.object({
    valor: Joi.number().min(0).optional(),
    unidad: Joi.string().valid('horas', 'días', 'semanas', 'meses', 'años').optional()
  }).optional(),
  
  // Campos adicionales - ✅ CORREGIDO: Permitir strings vacíos
  tiempoEntrega: Joi.string().max(100).allow('', null).optional(),
  garantia: Joi.string().max(200).allow('', null).optional(),
  icono: Joi.string().optional(),
  iconoType: Joi.string().valid('emoji', 'url', 'icon-name').optional(),
  colorIcono: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  colorFondo: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
  imagen: Joi.string().uri().allow('').optional(),
  orden: Joi.number().min(0).optional()
});

/**
 * Middleware para validar datos de actualización de servicio
 */
export const validateServiceUpdate = async (req, res, next) => {
  try {
    // Validar datos con Joi
    const { error, value } = updateServiceSchema.validate(req.body, {
      abortEarly: false, // Mostrar todos los errores
      stripUnknown: true, // Remover campos no definidos en el schema
      allowUnknown: false // No permitir campos adicionales
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      logger.error('❌ Validation error in service update:', errorDetails);

      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errorDetails
      });
    }

    // Validaciones adicionales de lógica de negocio
    if (value.tipoPrecio === 'rango') {
      if (value.precioMin && value.precioMax && value.precioMin > value.precioMax) {
        return res.status(400).json({
          success: false,
          message: 'El precio mínimo no puede ser mayor que el máximo',
          field: 'precio'
        });
      }
    }

    // Validar que si se proporciona categoria, existe en la DB
    if (value.categoria) {
      const Categoria = (await import('../models/Categoria.js')).default;
      const categoriaExists = await Categoria.findById(value.categoria);
      
      if (!categoriaExists) {
        return res.status(400).json({
          success: false,
          message: 'La categoría especificada no existe',
          field: 'categoria'
        });
      }
    }

    // Validar que si se proporciona responsable, es un usuario válido
    if (value.responsable) {
      const User = (await import('../models/User.js')).default;
      const userExists = await User.findById(value.responsable);
      
      if (!userExists) {
        return res.status(400).json({
          success: false,
          message: 'El usuario responsable especificado no existe',
          field: 'responsable'
        });
      }
    }

    // Asignar valores validados y sanitizados
    req.body = value;
    
    logger.info(`✅ Service update validation passed for service ${req.params.id}`);
    next();

  } catch (error) {
    logger.error('❌ Error in validateServiceUpdate middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en la validación de datos',
      error: error.message
    });
  }
};

/**
 * Middleware para validar creación de servicio
 */
const createServiceSchema = updateServiceSchema.fork(['titulo', 'descripcion', 'categoria'], (schema) => schema.required());

export const validateServiceCreate = async (req, res, next) => {
  try {
    const { error, value } = createServiceSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errorDetails
      });
    }

    // Validaciones adicionales para creación
    const Categoria = (await import('../models/Categoria.js')).default;
    const categoriaExists = await Categoria.findById(value.categoria);
    
    if (!categoriaExists) {
      return res.status(400).json({
        success: false,
        message: 'La categoría especificada no existe',
        field: 'categoria'
      });
    }

    req.body = value;
    next();

  } catch (error) {
    logger.error('❌ Error in validateServiceCreate middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en la validación de datos',
      error: error.message
    });
  }
};

export default {
  validateServiceUpdate,
  validateServiceCreate
};