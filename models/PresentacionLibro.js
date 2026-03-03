import mongoose from 'mongoose';

/**
 * 📚 Catálogo de Libros Electrónicos según SUNAT
 * Códigos oficiales PLE/SIRE
 */
export const CATALOGO_LIBROS = {
  '8.1':  { nombre: 'Registro de Compras', sistema: 'SIRE', obligatorioDesde: 'RER' },
  '14.1': { nombre: 'Registro de Ventas e Ingresos', sistema: 'SIRE', obligatorioDesde: 'RER' },
  '5.1':  { nombre: 'Libro Diario', sistema: 'PLE', obligatorioDesde: 'GENERAL' },
  '5.3':  { nombre: 'Libro Diario Formato Simplificado', sistema: 'PLE', obligatorioDesde: 'MYPE' },
  '6.1':  { nombre: 'Libro Mayor', sistema: 'PLE', obligatorioDesde: 'GENERAL' },
  '1.1':  { nombre: 'Libro Caja y Bancos', sistema: 'PLE', obligatorioDesde: 'GENERAL' },
  '3.1':  { nombre: 'Libro de Inventarios y Balances', sistema: 'PLE', obligatorioDesde: 'GENERAL' },
  '4.1':  { nombre: 'Libro de Retenciones', sistema: 'PLE', obligatorioDesde: 'GENERAL' },
  '13.1': { nombre: 'Registro de Activos Fijos', sistema: 'PLE', obligatorioDesde: 'GENERAL' }
};

/**
 * 📚 Libros sugeridos por régimen tributario
 */
export const LIBROS_POR_REGIMEN = {
  RUS: [],
  RER: ['8.1', '14.1'],
  MYPE: ['8.1', '14.1', '5.3'],
  GENERAL: ['8.1', '14.1', '5.1', '6.1', '3.1', '1.1']
};

/**
 * 📚 Schema de Presentación de Libro Electrónico
 * Registra la presentación mensual de cada libro para un cliente
 */
const presentacionLibroSchema = new mongoose.Schema({
  // Cliente al que pertenece
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClienteContable',
    required: [true, 'El clienteId es requerido'],
    index: true
  },

  // Periodo (YYYY-MM)
  periodo: {
    type: String,
    required: [true, 'El periodo es requerido'],
    match: [/^\d{4}-\d{2}$/, 'Formato de periodo inválido (YYYY-MM)'],
    index: true
  },
  anio: {
    type: Number,
    required: true,
    index: true
  },
  mes: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },

  // Código del libro (del catálogo)
  codigoLibro: {
    type: String,
    required: [true, 'El código del libro es requerido'],
    trim: true
  },

  // Nombre del libro
  nombreLibro: {
    type: String,
    required: [true, 'El nombre del libro es requerido'],
    trim: true
  },

  // Sistema usado (PLE o SIRE)
  sistema: {
    type: String,
    enum: ['PLE', 'SIRE'],
    default: 'PLE'
  },

  // Estado de presentación
  estado: {
    type: String,
    enum: ['PENDIENTE', 'PRESENTADO'],
    default: 'PENDIENTE',
    index: true
  },

  // Código/constancia de presentación que da SUNAT
  codigoConstancia: {
    type: String,
    trim: true,
    default: ''
  },

  // Fecha de presentación
  fechaPresentacion: {
    type: Date,
    default: null
  },

  // Observaciones
  observaciones: {
    type: String,
    trim: true,
    default: ''
  },

  // Quién registró
  registradoPor: {
    userId: { type: String, required: true }, // Clerk user ID
    nombre: { type: String, default: '' }
  },

  // Soft delete
  activo: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'presentaciones_libros'
});

// Índice compuesto: un libro por cliente-periodo-código
presentacionLibroSchema.index(
  { clienteId: 1, periodo: 1, codigoLibro: 1 },
  { unique: true }
);

// Índice para consultas de estado por periodo
presentacionLibroSchema.index({ periodo: 1, estado: 1, activo: 1 });

const PresentacionLibro = mongoose.model('PresentacionLibro', presentacionLibroSchema);

export default PresentacionLibro;
