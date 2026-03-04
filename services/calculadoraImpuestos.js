/**
 * 🧮 Calculadora de Impuestos SUNAT
 * Servicio de cálculo automático según régimen tributario peruano
 * 
 * Regímenes soportados:
 * - RUS (Régimen Único Simplificado): Cuota fija por categoría
 * - RER (Régimen Especial de Renta): 1.5% de ingresos netos
 * - MYPE (Régimen MYPE Tributario): Coeficiente o 1% mínimo
 * - GENERAL (Régimen General): Coeficiente o 1.5% mínimo
 */

// ========================================
// 📊 CONSTANTES TRIBUTARIAS
// ========================================

// Tasa de IGV en Perú (18%)
const TASA_IGV = 0.18;

// Cuotas fijas del RUS (Nuevo RUS)
const CUOTAS_RUS = {
  1: 20,   // Categoría 1: hasta S/ 5,000 ingresos → S/ 20
  2: 50    // Categoría 2: hasta S/ 8,000 ingresos → S/ 50
};

// Límites de ingresos por categoría RUS (mensual)
const LIMITES_RUS = {
  1: 5000,
  2: 8000
};

// Porcentaje de renta para RER
const TASA_RENTA_RER = 0.015; // 1.5%

// Porcentaje mínimo de renta para MYPE Tributario
const TASA_MINIMA_MYPE = 0.01; // 1%

// Porcentaje mínimo de renta para Régimen General
const TASA_MINIMA_GENERAL = 0.015; // 1.5%

// ========================================
// 🧮 FUNCIONES DE CÁLCULO
// ========================================

/**
 * Calcular IGV a pagar
 * Fórmula: Débito Fiscal - Crédito Fiscal
 * @param {number} ventasGravadas - Total de ventas gravadas con IGV
 * @param {number} creditoFiscal - Crédito fiscal del periodo (IGV de compras)
 * @param {number} saldoFavorAnterior - Saldo a favor de periodos anteriores
 * @returns {Object} Detalle del cálculo de IGV
 */
export const calcularIGV = (ventasGravadas, creditoFiscal, saldoFavorAnterior = 0) => {
  const debitoFiscal = Math.round(ventasGravadas * TASA_IGV * 100) / 100;
  const igvResultante = Math.round((debitoFiscal - creditoFiscal) * 100) / 100;
  
  let igvAPagar = 0;
  let saldoFavorSiguiente = 0;
  
  if (igvResultante > 0) {
    // Hay IGV a pagar, aplicar saldo a favor si existe
    igvAPagar = Math.max(0, igvResultante - saldoFavorAnterior);
    saldoFavorSiguiente = Math.max(0, saldoFavorAnterior - igvResultante);
  } else {
    // Crédito fiscal mayor que débito → saldo a favor
    igvAPagar = 0;
    saldoFavorSiguiente = Math.abs(igvResultante) + saldoFavorAnterior;
  }
  
  return {
    ventasGravadas,
    debitoFiscal,
    creditoFiscal,
    igvResultante,
    saldoFavorAnterior,
    igvAPagar: Math.round(igvAPagar * 100) / 100,
    saldoFavorSiguiente: Math.round(saldoFavorSiguiente * 100) / 100
  };
};

/**
 * Calcular Renta RUS (Nuevo Régimen Único Simplificado)
 * Cuota fija según categoría
 * @param {number} categoria - Categoría RUS (1 o 2)
 * @param {number} ingresosDelMes - Ingresos del mes (para validar categoría)
 * @returns {Object} Detalle del cálculo RUS
 */
export const calcularRentaRUS = (categoria, ingresosDelMes = 0) => {
  if (!CUOTAS_RUS[categoria]) {
    throw new Error(`Categoría RUS inválida: ${categoria}. Opciones: 1 o 2`);
  }
  
  // Verificar si los ingresos exceden el límite de la categoría
  const excedeLimite = ingresosDelMes > LIMITES_RUS[categoria];
  
  return {
    regimenAplicado: 'RUS',
    categoriaRUS: categoria,
    cuotaFijaRUS: CUOTAS_RUS[categoria],
    baseImponible: ingresosDelMes,
    coeficienteAplicado: 0, // RUS no usa coeficiente
    rentaCalculada: CUOTAS_RUS[categoria],
    rentaAPagar: CUOTAS_RUS[categoria],
    excedeLimiteCategoria: excedeLimite,
    limiteCategoria: LIMITES_RUS[categoria],
    nota: excedeLimite 
      ? `⚠️ Ingresos (S/ ${ingresosDelMes}) exceden límite de categoría ${categoria} (S/ ${LIMITES_RUS[categoria]}). Evaluar cambio de categoría o régimen.`
      : null
  };
};

/**
 * Calcular Renta RER (Régimen Especial de Renta)
 * Tasa fija de 1.5% sobre ingresos netos
 * @param {number} ingresosNetos - Ingresos netos del periodo
 * @returns {Object} Detalle del cálculo RER
 */
export const calcularRentaRER = (ingresosNetos) => {
  const rentaCalculada = Math.round(ingresosNetos * TASA_RENTA_RER * 100) / 100;
  
  return {
    regimenAplicado: 'RER',
    categoriaRUS: null,
    cuotaFijaRUS: null,
    baseImponible: ingresosNetos,
    coeficienteAplicado: TASA_RENTA_RER,
    rentaCalculada,
    rentaAPagar: rentaCalculada
  };
};

/**
 * Calcular Renta MYPE Tributario
 * Usa coeficiente del ejercicio anterior, con mínimo de 1%
 * @param {number} ingresosNetos - Ingresos netos del periodo
 * @param {number|null} coeficiente - Coeficiente calculado del ejercicio anterior
 * @returns {Object} Detalle del cálculo MYPE
 */
export const calcularRentaMYPE = (ingresosNetos, coeficiente = null) => {
  // Si no hay coeficiente o es menor al mínimo, usar 1%
  const coeficienteAplicado = (coeficiente && coeficiente > TASA_MINIMA_MYPE) 
    ? coeficiente 
    : TASA_MINIMA_MYPE;
  
  const rentaCalculada = Math.round(ingresosNetos * coeficienteAplicado * 100) / 100;
  
  return {
    regimenAplicado: 'MYPE',
    categoriaRUS: null,
    cuotaFijaRUS: null,
    baseImponible: ingresosNetos,
    coeficienteAplicado,
    rentaCalculada,
    rentaAPagar: rentaCalculada,
    usaMinimo: !coeficiente || coeficiente < TASA_MINIMA_MYPE,
    nota: (!coeficiente || coeficiente < TASA_MINIMA_MYPE)
      ? `Se aplica tasa mínima del ${TASA_MINIMA_MYPE * 100}%`
      : `Se aplica coeficiente del ${(coeficienteAplicado * 100).toFixed(4)}%`
  };
};

/**
 * Calcular Renta Régimen General
 * Usa coeficiente del ejercicio anterior, con mínimo de 1.5%
 * @param {number} ingresosNetos - Ingresos netos del periodo
 * @param {number|null} coeficiente - Coeficiente calculado del ejercicio anterior
 * @returns {Object} Detalle del cálculo Régimen General
 */
export const calcularRentaGeneral = (ingresosNetos, coeficiente = null) => {
  // Si no hay coeficiente o es menor al mínimo, usar 1.5%
  const coeficienteAplicado = (coeficiente && coeficiente > TASA_MINIMA_GENERAL) 
    ? coeficiente 
    : TASA_MINIMA_GENERAL;
  
  const rentaCalculada = Math.round(ingresosNetos * coeficienteAplicado * 100) / 100;
  
  return {
    regimenAplicado: 'GENERAL',
    categoriaRUS: null,
    cuotaFijaRUS: null,
    baseImponible: ingresosNetos,
    coeficienteAplicado,
    rentaCalculada,
    rentaAPagar: rentaCalculada,
    usaMinimo: !coeficiente || coeficiente < TASA_MINIMA_GENERAL,
    nota: (!coeficiente || coeficiente < TASA_MINIMA_GENERAL)
      ? `Se aplica tasa mínima del ${TASA_MINIMA_GENERAL * 100}%`
      : `Se aplica coeficiente del ${(coeficienteAplicado * 100).toFixed(4)}%`
  };
};

/**
 * 🎯 Función principal: Calcular renta según régimen
 * Detecta automáticamente el régimen y aplica el cálculo correspondiente
 * @param {string} regimen - Régimen tributario (RUS, RER, MYPE, GENERAL)
 * @param {Object} params - Parámetros del cálculo
 * @param {number} params.ingresosNetos - Ingresos netos del periodo
 * @param {number|null} params.coeficiente - Coeficiente (MYPE/General)
 * @param {number|null} params.categoriaRUS - Categoría RUS (1 o 2)
 * @returns {Object} Resultado del cálculo según régimen
 */
export const calcularRenta = (regimen, params = {}) => {
  const { ingresosNetos = 0, coeficiente = null, categoriaRUS = null } = params;
  
  switch (regimen) {
    case 'RUS':
      if (!categoriaRUS) {
        throw new Error('Para RUS se requiere la categoría (1 o 2)');
      }
      return calcularRentaRUS(categoriaRUS, ingresosNetos);
      
    case 'RER':
      return calcularRentaRER(ingresosNetos);
      
    case 'MYPE':
      return calcularRentaMYPE(ingresosNetos, coeficiente);
      
    case 'GENERAL':
      return calcularRentaGeneral(ingresosNetos, coeficiente);
      
    default:
      throw new Error(`Régimen tributario no soportado: ${regimen}`);
  }
};

/**
 * 🧮 Calcular declaración completa (IGV + Renta)
 * @param {Object} params
 * @param {string} params.regimen - Régimen tributario
 * @param {number} params.ventasGravadas - Ventas gravadas con IGV
 * @param {number} params.creditoFiscal - Crédito fiscal (IGV de compras)
 * @param {number} params.saldoFavorAnterior - Saldo a favor anterior
 * @param {number|null} params.coeficiente - Coeficiente de renta
 * @param {number|null} params.categoriaRUS - Categoría RUS
 * @param {string} params.zonaIGV - Zona IGV: 'GRAVADA', 'EXONERADA' o 'INAFECTA'
 * @returns {Object} Resultado completo del cálculo
 */
export const calcularDeclaracionCompleta = (params) => {
  const {
    regimen,
    ventasGravadas = 0,
    creditoFiscal = 0,
    saldoFavorAnterior = 0,
    coeficiente = null,
    categoriaRUS = null,
    zonaIGV = 'GRAVADA'
  } = params;
  
  // En RUS no se declara IGV separado (todo es cuota fija)
  // En zona EXONERADA o INAFECTA, IGV = 0
  let detalleIGV = null;
  const esExoneradoIGV = zonaIGV === 'EXONERADA' || zonaIGV === 'INAFECTA';
  
  if (regimen !== 'RUS') {
    if (esExoneradoIGV) {
      // Zona exonerada/inafecta: IGV es 0, no se cobra ni se paga
      detalleIGV = {
        ventasGravadas,
        debitoFiscal: 0,
        creditoFiscal: 0,
        igvResultante: 0,
        saldoFavorAnterior: 0,
        igvAPagar: 0,
        saldoFavorSiguiente: 0,
        zonaIGV,
        nota: zonaIGV === 'EXONERADA' 
          ? '📍 Zona exonerada de IGV (Ley 27037 - Amazonía)' 
          : '📍 Zona inafecta de IGV'
      };
    } else {
      detalleIGV = calcularIGV(ventasGravadas, creditoFiscal, saldoFavorAnterior);
    }
  }
  
  // Calcular renta según régimen
  const detalleRenta = calcularRenta(regimen, {
    ingresosNetos: ventasGravadas,
    coeficiente,
    categoriaRUS
  });
  
  // Total a pagar
  const igvAPagar = detalleIGV?.igvAPagar || 0;
  const rentaAPagar = detalleRenta.rentaAPagar || 0;
  const totalAPagar = Math.round((igvAPagar + rentaAPagar) * 100) / 100;
  
  return {
    regimen,
    zonaIGV,
    detalleIGV,
    detalleRenta,
    resumen: {
      igvAPagar,
      rentaAPagar,
      totalAPagar,
      esExoneradoIGV
    }
  };
};

// ========================================
// 📊 CONSTANTES LABORALES
// ========================================

// ESSALUD: 9% a cargo del empleador
const TASA_ESSALUD = 0.09;

// ONP: 13% a cargo del trabajador (retenido por empleador)
const TASA_ONP = 0.13;

// AFP: Aporte obligatorio 10%
const TASA_AFP_APORTE = 0.10;

// AFP Comisiones y Prima de Seguro (vigentes 2026)
const AFP_TASAS = {
  HABITAT:   { comision: 0.0138, primaSeguro: 0.0186 },
  INTEGRA:   { comision: 0.0155, primaSeguro: 0.0186 },
  PRIMA:     { comision: 0.0155, primaSeguro: 0.0186 },
  PROFUTURO: { comision: 0.0169, primaSeguro: 0.0186 }
};

// ========================================
// 📊 CONSTANTES EXPORTADAS
// ========================================
export const CONSTANTES_TRIBUTARIAS = {
  TASA_IGV,
  CUOTAS_RUS,
  LIMITES_RUS,
  TASA_RENTA_RER,
  TASA_MINIMA_MYPE,
  TASA_MINIMA_GENERAL,
  REGIMENES: ['RUS', 'RER', 'MYPE', 'GENERAL'],
  REGIMENES_DESCRIPCION: {
    RUS: 'Nuevo Régimen Único Simplificado (NRUS)',
    RER: 'Régimen Especial de Renta (RER)',
    MYPE: 'Régimen MYPE Tributario (RMT)',
    GENERAL: 'Régimen General (RG)'
  },
  TASA_ESSALUD,
  TASA_ONP,
  TASA_AFP_APORTE,
  AFP_TASAS
};

// ========================================
// 👥 CÁLCULO DE PLANILLA (PLAME)
// ========================================

/**
 * Calcular declaración de Planilla (PDT 601 - PLAME)
 * @param {Object} params
 * @param {number} params.cantidadTrabajadores - Nº total de trabajadores
 * @param {number} params.totalRemuneraciones - Suma bruta de sueldos
 * @param {number} params.cantidadTrabajadoresONP - Nº de trabajadores en ONP
 * @param {number} params.totalRemuneracionesONP - Remuneraciones de trabajadores ONP
 * @param {number} params.retenciones5ta - Retenciones IR 5ta categoría (ya calculadas)
 * @param {number} params.cantidadTrabajadores5ta - Nº trabajadores con retención 5ta
 * @param {number} params.vidaLey - Monto Vida Ley/SCTR (si aplica)
 * @returns {Object} Detalle del cálculo de planilla
 */
export const calcularPlanilla = (params = {}) => {
  const {
    cantidadTrabajadores = 0,
    totalRemuneraciones = 0,
    cantidadTrabajadoresONP = 0,
    totalRemuneracionesONP = 0,
    cantidadTrabajadoresAFP = 0,   // Trabajadores AFP dentro de PLAME
    totalRemuneracionesAFP = 0,    // Sus remuneraciones (referencia)
    essalud = 0,                   // Monto ESSALUD manual (ingresado por el contador)
    sis = 0,                       // Monto SIS manual (alternativa ESSALUD para MYPE)
    retenciones5ta = 0,
    cantidadTrabajadores5ta = 0,
    vidaLey = 0
  } = params;

  // Total de trabajadores y remuneraciones (referencia)
  const totalTrabajadores = cantidadTrabajadores || (cantidadTrabajadoresONP + cantidadTrabajadoresAFP);
  const baseRemuneraciones = totalRemuneraciones || (totalRemuneracionesONP + totalRemuneracionesAFP);

  // ONP = 13% SOLO sobre remuneraciones de trabajadores en ONP (calculado automáticamente)
  const onp = Math.round(totalRemuneracionesONP * TASA_ONP * 100) / 100;

  // ESSALUD y SIS: montos ingresados manualmente por el contador
  // Ref: ESSALUD = 9% × totalRemuneraciones; SIS-MYPE ≈ S/ 15 por trabajador
  const totalAPagar = Math.round((essalud + sis + onp + retenciones5ta + vidaLey) * 100) / 100;

  return {
    cantidadTrabajadores: totalTrabajadores,
    totalRemuneraciones: baseRemuneraciones,
    essalud,
    sis,
    onp,
    cantidadTrabajadoresONP,
    totalRemuneracionesONP,
    cantidadTrabajadoresAFP,
    totalRemuneracionesAFP,
    retenciones5ta,
    cantidadTrabajadores5ta,
    vidaLey,
    totalAPagar,
    desglose: {
      essalud: { monto: essalud, nota: 'Monto manual — trabajadores ESSALUD' },
      sis: { monto: sis, nota: 'Monto manual — trabajadores SIS-MYPE' },
      onp: { tasa: TASA_ONP, base: totalRemuneracionesONP, nota: 'Solo trabajadores ONP', monto: onp },
      afpEnPLAME: { cantidadTrabajadoresAFP, totalRemuneracionesAFP, nota: 'Incluidos en ESSALUD/SIS, aporte AFP va a AFPnet' },
      retenciones5ta: { monto: retenciones5ta },
      vidaLey: { monto: vidaLey }
    }
  };
};

// ========================================
// 🏦 CÁLCULO DE AFP (AFPnet)
// ========================================

/**
 * Calcular declaración de AFP
 * @param {Object} params
 * @param {string} params.afpNombre - Nombre de la AFP (HABITAT, INTEGRA, PRIMA, PROFUTURO)
 * @param {number} params.cantidadAfiliados - Nº de trabajadores afiliados
 * @param {number} params.totalRemuneraciones - Suma remuneraciones de afiliados AFP
 * @param {number} params.aporteVoluntario - Aporte voluntario adicional
 * @returns {Object} Detalle del cálculo AFP
 */
export const calcularAFP = (params = {}) => {
  const {
    afpNombre = '',
    cantidadAfiliados = 0,
    totalRemuneraciones = 0,
    aporteVoluntario = 0
  } = params;

  const tasas = AFP_TASAS[afpNombre] || { comision: 0, primaSeguro: 0 };

  // Aporte obligatorio: 10% de la remuneración
  const aporteObligatorio = Math.round(totalRemuneraciones * TASA_AFP_APORTE * 100) / 100;

  // Comisión AFP (varía por AFP)
  const comisionAFP = Math.round(totalRemuneraciones * tasas.comision * 100) / 100;

  // Prima de seguro (~1.86%)
  const primaSeguro = Math.round(totalRemuneraciones * tasas.primaSeguro * 100) / 100;

  // Total
  const totalAPagar = Math.round((aporteObligatorio + comisionAFP + primaSeguro + aporteVoluntario) * 100) / 100;

  return {
    afpNombre,
    cantidadAfiliados,
    totalRemuneraciones,
    aporteObligatorio,
    comisionAFP,
    primaSeguro,
    aporteVoluntario,
    totalAPagar,
    tasasAplicadas: {
      aporteObligatorio: TASA_AFP_APORTE,
      comision: tasas.comision,
      primaSeguro: tasas.primaSeguro
    }
  };
};

export default {
  calcularIGV,
  calcularRenta,
  calcularRentaRUS,
  calcularRentaRER,
  calcularRentaMYPE,
  calcularRentaGeneral,
  calcularDeclaracionCompleta,
  calcularPlanilla,
  calcularAFP,
  CONSTANTES_TRIBUTARIAS
};
