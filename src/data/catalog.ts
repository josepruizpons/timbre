import type { Bloque, DefRequisito, Expediente } from '../types'

// Catálogo de requisitos de una compraventa de vivienda en España.
// Vive en el código, no en la base de datos: sus reglas de aplicabilidad son
// predicados sobre las circunstancias del expediente.
// `vigencia` = días de validez del documento una vez emitido (null = no caduca).
// `aplica` decide si el requisito entra en el expediente según sus circunstancias.

export const BLOQUES: Bloque[] = [
  { sigla: 'IN', nombre: 'Inmueble', descripcion: 'Situación registral, física y energética de la finca' },
  { sigla: 'PT', nombre: 'Partes', descripcion: 'Identidad y capacidad de vendedor y comprador' },
  { sigla: 'FN', nombre: 'Financiación', descripcion: 'Hipoteca del comprador y cargas del vendedor' },
  { sigla: 'FS', nombre: 'Fiscal y blanqueo', descripcion: 'Impuestos y obligaciones de la Ley 10/2010' },
  { sigla: 'NT', nombre: 'Notaría', descripcion: 'Preparación material de la firma' }
]

// Comunidades que siguen exigiendo cédula de habitabilidad para transmitir.
export const CCAA_CEDULA: string[] = [
  'Cataluña', 'Navarra', 'Canarias', 'Extremadura',
  'Illes Balears', 'La Rioja', 'Asturias', 'Región de Murcia'
]

export const CATALOGO: DefRequisito[] = [
  // ─── INMUEBLE ────────────────────────────────────────────────────────────
  {
    id: 'IN-01',
    nombre: 'Nota simple registral actualizada',
    resumen: 'Fotografía registral de la finca: titularidad, descripción, cargas, hipotecas y embargos.',
    emisor: 'Registro de la Propiedad',
    responsable: 'Agencia',
    vigencia: 90,
    critico: true,
    referencia: 'Art. 222 Ley Hipotecaria',
    nota: 'El notario solicita además una nota telemática el mismo día de la firma.'
  },
  {
    id: 'IN-02',
    nombre: 'Escritura de título del vendedor',
    resumen: 'Título original de adquisición: compraventa, herencia, donación o adjudicación.',
    emisor: 'Notaría de origen',
    responsable: 'Vendedor',
    vigencia: null,
    critico: true,
    referencia: 'Art. 1462 Código Civil',
    nota: 'Sin el original no se puede autorizar la escritura.'
  },
  {
    id: 'IN-03',
    nombre: 'Certificado de eficiencia energética',
    resumen: 'Calificación energética de la vivienda, registrada en el órgano competente de la comunidad autónoma.',
    emisor: 'Técnico certificador',
    responsable: 'Vendedor',
    vigencia: 3650,
    critico: true,
    referencia: 'RD 390/2021',
    nota: 'Validez de 10 años, reducida a 5 en calificación G. Obligatorio desde 2013 para anunciar y transmitir.'
  },
  {
    id: 'IN-04',
    nombre: 'Cédula de habitabilidad',
    resumen: 'Acredita que la vivienda cumple las condiciones mínimas de habitabilidad.',
    emisor: 'Comunidad autónoma',
    responsable: 'Vendedor',
    vigencia: null,
    critico: true,
    referencia: 'Normativa autonómica',
    nota: 'Exigible solo en 8 comunidades. Sin cédula vigente el notario no autoriza la escritura.',
    aplica: (e: Expediente) => CCAA_CEDULA.includes(e.ccaa)
  },
  {
    id: 'IN-05',
    nombre: 'Certificado de deuda cero con la comunidad',
    resumen: 'El administrador certifica que el vendedor está al corriente de las cuotas de comunidad.',
    emisor: 'Administrador de fincas',
    responsable: 'Vendedor',
    vigencia: 30,
    critico: true,
    referencia: 'Art. 9.1.e) Ley de Propiedad Horizontal',
    nota: 'Debe reflejar también las derramas aprobadas y pendientes de pago.',
    aplica: (e: Expediente) => !e.unifamiliar
  },
  {
    id: 'IN-06',
    nombre: 'Último recibo del IBI',
    resumen: 'Recibo del Impuesto sobre Bienes Inmuebles del ejercicio en curso, pagado.',
    emisor: 'Ayuntamiento',
    responsable: 'Vendedor',
    vigencia: 365,
    critico: false,
    referencia: 'Art. 64.2 TRLRHL',
    nota: 'La finca responde de las cuotas no prescritas, por eso el comprador debe verlo.'
  },
  {
    id: 'IN-07',
    nombre: 'Informe de Evaluación del Edificio (ITE/IEE)',
    resumen: 'Estado de conservación, accesibilidad y eficiencia energética del edificio.',
    emisor: 'Comunidad de propietarios',
    responsable: 'Vendedor',
    vigencia: null,
    critico: false,
    referencia: 'RD Leg. 7/2015, art. 29',
    nota: 'Exigible en edificios de más de 45–50 años según ordenanza municipal.',
    // El umbral de la ITE es la edad del edificio, contada contra el año en
    // curso: en el POC estaba escrito 2026 a mano.
    aplica: (e: Expediente) =>
      !e.obraNueva &&
      e.anioConstruccion !== null &&
      new Date().getFullYear() - e.anioConstruccion >= 45
  },
  {
    id: 'IN-08',
    nombre: 'Certificación catastral descriptiva y gráfica',
    resumen: 'Referencia catastral, superficie y delimitación gráfica de la finca.',
    emisor: 'Dirección General del Catastro',
    responsable: 'Agencia',
    vigencia: 365,
    critico: false,
    referencia: 'RD Leg. 1/2004, art. 38',
    nota: 'Permite detectar discrepancias entre Catastro y Registro antes de la firma.'
  },
  {
    id: 'IN-09',
    nombre: 'Últimas facturas de suministros',
    resumen: 'Luz, agua y gas, para el cambio de titularidad tras la firma.',
    emisor: 'Compañías suministradoras',
    responsable: 'Vendedor',
    vigencia: null,
    critico: false,
    referencia: '—',
    nota: 'Conviene llevar el CUPS de luz y gas a la notaría.'
  },
  {
    id: 'IN-10',
    nombre: 'Licencia de primera ocupación y libro del edificio',
    resumen: 'Documentación de obra nueva: licencia, garantías decenales y libro del edificio.',
    emisor: 'Ayuntamiento / promotor',
    responsable: 'Vendedor',
    vigencia: null,
    critico: true,
    referencia: 'Ley 38/1999 de Ordenación de la Edificación',
    nota: 'Incluye el seguro decenal y el certificado final de obra.',
    aplica: (e: Expediente) => e.obraNueva
  },

  // ─── PARTES ──────────────────────────────────────────────────────────────
  {
    id: 'PT-01',
    nombre: 'DNI o NIE en vigor de todas las partes',
    resumen: 'Documento de identidad original y no caducado de vendedores y compradores.',
    emisor: 'Ministerio del Interior',
    responsable: 'Ambas partes',
    vigencia: null,
    critico: true,
    referencia: 'Art. 23 Ley del Notariado',
    nota: 'Un DNI caducado impide la firma. Revisar la fecha dos semanas antes.'
  },
  {
    id: 'PT-02',
    nombre: 'Estado civil y régimen económico matrimonial',
    resumen: 'Declaración y, si procede, capitulaciones matrimoniales inscritas.',
    emisor: 'Registro Civil / notaría',
    responsable: 'Ambas partes',
    vigencia: null,
    critico: true,
    referencia: 'Art. 1320 y 1377 Código Civil',
    nota: 'La vivienda habitual del matrimonio requiere consentimiento del cónyuge aunque no sea titular.'
  },
  {
    id: 'PT-03',
    nombre: 'Poder notarial de representación',
    resumen: 'Poder especial suficiente para comparecer y otorgar en nombre de un tercero.',
    emisor: 'Notaría',
    responsable: 'Parte representada',
    vigencia: null,
    critico: false,
    referencia: 'Art. 1259 Código Civil',
    nota: 'El notario de la firma valora la suficiencia del poder; enviarlo con antelación.',
    aplica: (e: Expediente) => e.representacion
  },
  {
    id: 'PT-04',
    nombre: 'NIE del comprador no residente',
    resumen: 'Número de identidad de extranjero, imprescindible para escriturar y liquidar impuestos.',
    emisor: 'Policía Nacional',
    responsable: 'Comprador',
    vigencia: null,
    critico: true,
    referencia: 'RD 557/2011, art. 206',
    nota: 'Sin NIE no se puede inscribir la compra ni presentar el modelo 600.',
    aplica: (e: Expediente) => e.compradorExtranjero
  },
  {
    id: 'PT-05',
    nombre: 'Contrato de arras penitenciales',
    resumen: 'Señal que reserva la vivienda y fija precio, plazo y notaría de firma.',
    emisor: 'Agencia',
    responsable: 'Agencia',
    vigencia: null,
    critico: true,
    referencia: 'Art. 1454 Código Civil',
    nota: 'Penitenciales salvo pacto: quien desiste pierde o devuelve duplicada la señal.'
  },
  {
    id: 'PT-06',
    nombre: 'Nota de encargo de intermediación',
    resumen: 'Encargo firmado por el vendedor con honorarios, exclusividad y duración.',
    emisor: 'Agencia',
    responsable: 'Agencia',
    vigencia: null,
    critico: false,
    referencia: 'Ley 2/2009 y normativa autonómica de consumo',
    nota: 'Documento interno de la agencia, no se aporta a la notaría.'
  },
  {
    id: 'PT-07',
    nombre: 'Certificado de últimas voluntades y adjudicación de herencia',
    resumen: 'Cuando el vendedor transmite una finca adquirida por herencia todavía en trámite.',
    emisor: 'Ministerio de Justicia / notaría',
    responsable: 'Vendedor',
    vigencia: null,
    critico: true,
    referencia: 'Art. 14 Ley Hipotecaria',
    nota: 'La herencia debe estar aceptada, liquidada de ISD e inscrita antes de vender.',
    aplica: (e: Expediente) => e.herencia
  },

  // ─── FINANCIACIÓN ────────────────────────────────────────────────────────
  {
    id: 'FN-01',
    nombre: 'FEIN — Ficha Europea de Información Normalizada',
    resumen: 'Oferta vinculante del banco con todas las condiciones del préstamo.',
    emisor: 'Entidad financiera',
    responsable: 'Comprador',
    vigencia: 10,
    critico: true,
    referencia: 'Art. 10 Ley 5/2019 de Contratos de Crédito Inmobiliario',
    nota: 'Debe entregarse con al menos 10 días naturales de antelación a la firma.',
    aplica: (e: Expediente) => e.hipoteca
  },
  {
    id: 'FN-02',
    nombre: 'FiAE — Ficha de Advertencias Estandarizadas',
    resumen: 'Advertencias sobre cláusulas sensibles: índices, divisa, vencimiento anticipado.',
    emisor: 'Entidad financiera',
    responsable: 'Comprador',
    vigencia: null,
    critico: true,
    referencia: 'Art. 10 Ley 5/2019',
    nota: 'Se entrega junto con la FEIN y el proyecto de escritura.',
    aplica: (e: Expediente) => e.hipoteca
  },
  {
    id: 'FN-03',
    nombre: 'Acta notarial de transparencia material',
    resumen: 'Comparecencia previa y gratuita ante notario para verificar que el comprador entiende el préstamo.',
    emisor: 'Notaría',
    responsable: 'Comprador',
    vigencia: null,
    critico: true,
    referencia: 'Art. 15 Ley 5/2019',
    nota: 'Se firma como muy tarde el día anterior a la escritura. Sin acta no hay hipoteca.',
    aplica: (e: Expediente) => e.hipoteca
  },
  {
    id: 'FN-04',
    nombre: 'Tasación oficial homologada',
    resumen: 'Valoración de la vivienda por sociedad homologada por el Banco de España.',
    emisor: 'Sociedad de tasación',
    responsable: 'Comprador',
    vigencia: 180,
    critico: true,
    referencia: 'Orden ECO/805/2003',
    nota: 'Validez de 6 meses. Si caduca, el banco exige tasación nueva.',
    aplica: (e: Expediente) => e.hipoteca
  },
  {
    id: 'FN-05',
    nombre: 'Certificado de deuda pendiente y cancelación de cargas',
    resumen: 'Saldo pendiente de la hipoteca del vendedor a fecha de firma y compromiso de cancelación.',
    emisor: 'Entidad acreedora del vendedor',
    responsable: 'Vendedor',
    vigencia: 15,
    critico: true,
    referencia: 'Art. 82 Ley Hipotecaria',
    nota: 'Se pide con fecha del día de la firma; el apoderado del banco suele comparecer.',
    aplica: (e: Expediente) => e.cargaHipotecaria
  },

  // ─── FISCAL Y BLANQUEO ───────────────────────────────────────────────────
  {
    id: 'FS-01',
    nombre: 'Justificación documental de los medios de pago',
    resumen: 'Trazabilidad de cada euro: transferencias, cheques bancarios y sus fechas.',
    emisor: 'Comprador',
    responsable: 'Comprador',
    vigencia: null,
    critico: true,
    referencia: 'Ley 10/2010 de prevención del blanqueo de capitales',
    nota: 'El notario debe identificar los medios de pago en la escritura o no puede autorizarla.'
  },
  {
    id: 'FS-02',
    nombre: 'Declaración de titularidad real y origen de fondos',
    resumen: 'Cuestionario de prevención de blanqueo de ambas partes.',
    emisor: 'Notaría / agencia',
    responsable: 'Ambas partes',
    vigencia: null,
    critico: false,
    referencia: 'Art. 4 Ley 10/2010',
    nota: 'Obligatorio también para la agencia como sujeto obligado.'
  },
  {
    id: 'FS-03',
    nombre: 'Provisión para ITP / IVA y AJD',
    resumen: 'Impuesto de transmisiones del comprador, o IVA más actos jurídicos documentados en obra nueva.',
    emisor: 'Comprador',
    responsable: 'Comprador',
    vigencia: null,
    critico: true,
    referencia: 'RD Leg. 1/1993 · Ley 37/1992',
    nota: 'Plazo de 30 días hábiles desde la firma. El tipo de ITP varía por comunidad autónoma.'
  },
  {
    id: 'FS-04',
    nombre: 'Liquidación de plusvalía municipal (IIVTNU)',
    resumen: 'Impuesto sobre el incremento de valor de los terrenos, a cargo del vendedor.',
    emisor: 'Ayuntamiento',
    responsable: 'Vendedor',
    vigencia: null,
    critico: false,
    referencia: 'RD Ley 26/2021',
    nota: 'Plazo de 30 días hábiles. Se puede elegir entre método objetivo y plusvalía real.'
  },
  {
    id: 'FS-05',
    nombre: 'Modelo 211 — retención del 3 % a no residentes',
    resumen: 'El comprador retiene el 3 % del precio e ingresa a cuenta del IRNR del vendedor.',
    emisor: 'Comprador',
    responsable: 'Comprador',
    vigencia: null,
    critico: true,
    referencia: 'Art. 25.2 TR Ley IRNR',
    nota: 'Plazo de un mes desde la firma. Sin el 211 el vendedor no recupera el exceso.',
    aplica: (e: Expediente) => e.vendedorNoResidente
  },

  // ─── NOTARÍA ─────────────────────────────────────────────────────────────
  {
    id: 'NT-01',
    nombre: 'Reserva de firma y hoja de encargo notarial',
    resumen: 'Fecha, hora y notaría elegida por el comprador, con los datos de todos los comparecientes.',
    emisor: 'Notaría',
    responsable: 'Agencia',
    vigencia: null,
    critico: true,
    referencia: 'Art. 3 Reglamento Notarial',
    nota: 'La elección de notario corresponde por ley al comprador.'
  },
  {
    id: 'NT-02',
    nombre: 'Minuta de comparecencia y reparto de gastos',
    resumen: 'Cuadro de quién paga notaría, registro, gestoría e impuestos.',
    emisor: 'Agencia',
    responsable: 'Agencia',
    vigencia: null,
    critico: false,
    referencia: 'Art. 1455 Código Civil',
    nota: 'Salvo pacto, la matriz la paga el vendedor y las copias el comprador.'
  },
  {
    id: 'NT-03',
    nombre: 'Cheque bancario nominativo',
    resumen: 'Instrumento de pago del precio en el acto de la firma.',
    emisor: 'Entidad del comprador',
    responsable: 'Comprador',
    vigencia: null,
    critico: true,
    referencia: 'Ley 19/1985 Cambiaria y del Cheque',
    nota: 'Pedir al banco con 48 h de antelación y llevar copia del cargo en cuenta.'
  },
  {
    id: 'NT-04',
    nombre: 'Entrega de llaves y acta de estado de la vivienda',
    resumen: 'Inventario, lecturas de contadores y llaves entregadas en el acto.',
    emisor: 'Agencia',
    responsable: 'Agencia',
    vigencia: null,
    critico: false,
    referencia: 'Art. 1462 Código Civil',
    nota: 'La entrega de llaves constituye la tradición que consuma la transmisión.'
  }
]

export const POR_ID: Record<string, DefRequisito> =
  Object.fromEntries(CATALOGO.map((r) => [r.id, r]))

/** Requisitos que aplican a un expediente concreto, en orden de bloque. */
export function requisitosDe(expediente: Expediente): DefRequisito[] {
  return CATALOGO.filter((r) => !r.aplica || r.aplica(expediente))
}

export function bloqueDe(id: string): Bloque | undefined {
  return BLOQUES.find((b) => b.sigla === id.slice(0, 2))
}
