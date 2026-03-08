/**
 * Modelo IntegrationConfig
 * Almacena configuraciones de integraciones externas (API keys, secrets, etc.)
 * Patrón singleton por integración (similar a AgentConfig/CacheConfig)
 */

import mongoose from 'mongoose';

const integrationConfigSchema = new mongoose.Schema({
  integrationName: {
    type: String,
    required: true,
    unique: true,
    enum: ['sersi']
  },
  enabled: {
    type: Boolean,
    default: true
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  updatedBy: {
    type: String // Clerk user ID
  }
}, {
  timestamps: true
});

/**
 * Obtiene la configuración de una integración, o null si no existe
 */
integrationConfigSchema.statics.getConfig = async function(integrationName) {
  return this.findOne({ integrationName });
};

/**
 * Actualiza o crea la configuración de una integración
 */
integrationConfigSchema.statics.setConfig = async function(integrationName, config, updatedBy) {
  return this.findOneAndUpdate(
    { integrationName },
    {
      integrationName,
      config,
      enabled: true,
      updatedBy
    },
    { upsert: true, new: true }
  );
};

const IntegrationConfig = mongoose.model('IntegrationConfig', integrationConfigSchema);

export default IntegrationConfig;
