import mongoose from 'mongoose';

/**
 * 📅 Schema de Cronograma SUNAT
 * Tabla de vencimientos mensuales según último dígito del RUC
 * Se actualiza una vez al año con el cronograma publicado por SUNAT
 */
const cronogramaSunatSchema = new mongoose.Schema(
  {
    // ========================================
    // 📅 PERIODO Y DÍGITO
    // ========================================
    anio: {
      type: Number,
      required: [true, 'El año es requerido'],
      index: true
    },
    mesTributario: {
      type: String, // Formato YYYY-MM (periodo tributario)
      required: [true, 'El mes tributario es requerido'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato debe ser YYYY-MM']
    },
    digitoRuc: {
      type: Number,
      required: [true, 'El dígito del RUC es requerido'],
      min: 0,
      max: 9,
      index: true
    },
    
    // ========================================
    // 📅 FECHA DE VENCIMIENTO
    // ========================================
    fechaVencimiento: {
      type: Date,
      required: [true, 'La fecha de vencimiento es requerida']
    },
    
    // ========================================
    // 📝 DESCRIPCIÓN
    // ========================================
    descripcion: {
      type: String,
      default: ''
    },
    
    // ========================================
    // 🏷️ TIPO (para diferenciar declaraciones)
    // ========================================
    tipo: {
      type: String,
      enum: ['MENSUAL', 'ANUAL'],
      default: 'MENSUAL'
    },
    
    // Estado activo
    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// ========================================
// 🔍 ÍNDICES COMPUESTOS
// ========================================
cronogramaSunatSchema.index({ mesTributario: 1, digitoRuc: 1 }, { unique: true });
cronogramaSunatSchema.index({ anio: 1, digitoRuc: 1 });

// ========================================
// 🔧 MÉTODOS ESTÁTICOS
// ========================================

/**
 * Obtener fecha de vencimiento para un RUC y periodo específico
 * @param {string} ruc - RUC del contribuyente (11 dígitos)
 * @param {string} periodo - Periodo tributario (YYYY-MM)
 * @returns {Date|null} Fecha de vencimiento
 */
cronogramaSunatSchema.statics.getFechaVencimiento = async function(ruc, periodo) {
  const digitoRuc = parseInt(ruc.charAt(ruc.length - 1));
  
  const cronograma = await this.findOne({
    mesTributario: periodo,
    digitoRuc,
    activo: true
  });
  
  return cronograma ? cronograma.fechaVencimiento : null;
};

/**
 * Obtener cronograma completo de un periodo
 * @param {string} periodo - Periodo tributario (YYYY-MM)
 * @returns {Array} Cronograma ordenado por dígito
 */
cronogramaSunatSchema.statics.getCronogramaPeriodo = function(periodo) {
  return this.find({ mesTributario: periodo, activo: true })
    .sort({ digitoRuc: 1 })
    .lean();
};

/**
 * Cargar cronograma de un año completo
 * Recibe un array de objetos con la data del cronograma
 * @param {number} anio - Año del cronograma
 * @param {Array} datos - Array con los datos del cronograma
 */
cronogramaSunatSchema.statics.cargarCronograma = async function(anio, datos) {
  // Eliminar cronograma anterior del mismo año
  await this.deleteMany({ anio });
  
  // Insertar nuevo cronograma
  const documentos = datos.map(item => ({
    anio,
    mesTributario: item.mesTributario,
    digitoRuc: item.digitoRuc,
    fechaVencimiento: new Date(item.fechaVencimiento),
    descripcion: item.descripcion || `Vencimiento ${item.mesTributario} dígito ${item.digitoRuc}`,
    tipo: item.tipo || 'MENSUAL',
    activo: true
  }));
  
  return this.insertMany(documentos);
};

/**
 * Generar cronograma por defecto (aproximado)
 * Útil para cuando no se ha cargado el cronograma oficial
 * Regla general SUNAT: vencimiento es el mes siguiente al periodo tributario
 * @param {number} anio - Año para generar
 */
cronogramaSunatSchema.statics.generarCronogramaDefault = async function(anio) {
  // Tabla base de días de vencimiento por dígito RUC
  // (Referencia: Resolución de Superintendencia SUNAT)
  const diasPorDigito = {
    0: 14,  // Día 14 del mes siguiente
    1: 15,  // Día 15
    2: 16,  // Día 16
    3: 17,  // Día 17
    4: 18,  // Día 18
    5: 19,  // Día 19
    6: 20,  // Día 20
    7: 21,  // Día 21
    8: 22,  // Día 22
    9: 23   // Día 23
  };
  
  const datos = [];
  
  for (let mes = 1; mes <= 12; mes++) {
    const mesTributario = `${anio}-${String(mes).padStart(2, '0')}`;
    // El vencimiento es en el mes SIGUIENTE al periodo tributario
    const mesVencimiento = mes === 12 ? 1 : mes + 1;
    const anioVencimiento = mes === 12 ? anio + 1 : anio;
    
    for (let digito = 0; digito <= 9; digito++) {
      const dia = diasPorDigito[digito];
      
      // Verificar que el día sea válido para el mes
      const fechaVencimiento = new Date(anioVencimiento, mesVencimiento - 1, dia);
      
      // Si cae fin de semana, mover al siguiente día hábil
      const diaSemana = fechaVencimiento.getDay();
      if (diaSemana === 0) fechaVencimiento.setDate(fechaVencimiento.getDate() + 1); // Domingo → Lunes
      if (diaSemana === 6) fechaVencimiento.setDate(fechaVencimiento.getDate() + 2); // Sábado → Lunes
      
      datos.push({
        mesTributario,
        digitoRuc: digito,
        fechaVencimiento: fechaVencimiento.toISOString(),
        descripcion: `Periodo ${mesTributario} - Dígito ${digito}`,
        tipo: 'MENSUAL'
      });
    }
  }
  
  return this.cargarCronograma(anio, datos);
};

const CronogramaSunat = mongoose.model('CronogramaSunat', cronogramaSunatSchema);

export default CronogramaSunat;
