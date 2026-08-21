import type { TipoCampo } from '../types'

/**
 * Qué información trae dentro cada tipo de documento.
 *
 * Es la pieza que faltaba para que el expediente deje de ser un formulario. Los
 * datos de una venta no se los inventa nadie: están escritos en los papeles que
 * el agente ya tiene en la carpeta —la superficie en la nota simple, el capital
 * en la FEIN, el protocolo en la escritura—. Hoy los teclea otra vez en el
 * formulario del caso y se pierde de dónde salieron.
 *
 * Al subir un papel en el hueco de su requisito, **el tipo ya se sabe por
 * construcción**: si lo subes en IN-01, es una nota simple. No hay que
 * clasificar nada, así que se puede enseñar directamente la lista de lo que ese
 * papel trae dentro.
 *
 * `alExpediente` dice qué campo del expediente alimenta ese dato. Los que lo
 * llevan no son teclear dos veces: son la primera vez que se teclean.
 *
 * **Sin validar.** Estos esquemas se redactaron a partir de conocimiento
 * general de compraventas en España, igual que el catálogo de requisitos, y
 * como él **no los ha revisado ningún agente en ejercicio**. Son la lista de la
 * que más fácil es que sobren o falten campos.
 */

export interface CampoDoc {
  clave: string
  etiqueta: string
  tipo: TipoCampo
  /** Campo del expediente que este dato alimenta, si alguno. */
  alExpediente?: string
  pista?: string
  opciones?: string[]
}

export const ESQUEMAS: Record<string, CampoDoc[]> = {
  // ─── Inmueble ─────────────────────────────────────────────────────────────
  'IN-01': [
    { clave: 'fincaRegistral', etiqueta: 'Número de finca', tipo: 'text', alExpediente: 'fincaRegistral', pista: 'Suele ir detrás de «FINCA Nº».' },
    { clave: 'registro', etiqueta: 'Registro de la Propiedad', tipo: 'text', alExpediente: 'registro' },
    { clave: 'idufir', etiqueta: 'IDUFIR / CRU', tipo: 'text', pista: 'Identificador único de finca, 14 cifras.' },
    { clave: 'titularRegistral', etiqueta: 'Titular registral', tipo: 'text', pista: 'Tiene que coincidir con quien vende.' },
    { clave: 'superficieRegistral', etiqueta: 'Superficie registral', tipo: 'number', alExpediente: 'superficie', pista: 'm² según el Registro. Casi nunca coincide con la catastral.' },
    { clave: 'cargas', etiqueta: 'Cargas que constan', tipo: 'textarea', pista: 'Hipotecas, embargos, afecciones, servidumbres. «Libre de cargas» también es un dato.' },
    { clave: 'notaExpedida', etiqueta: 'Fecha de expedición', tipo: 'date' },
  ],
  'IN-02': [
    { clave: 'tituloTipo', etiqueta: 'Tipo de título', tipo: 'select', opciones: ['Compraventa', 'Herencia', 'Donación', 'Adjudicación', 'Obra nueva', 'Otro'] },
    { clave: 'tituloNotaria', etiqueta: 'Notaría que lo autorizó', tipo: 'text' },
    { clave: 'tituloProtocolo', etiqueta: 'Número de protocolo', tipo: 'text' },
    { clave: 'tituloFecha', etiqueta: 'Fecha de la escritura', tipo: 'date' },
    { clave: 'tituloPrecio', etiqueta: 'Valor de adquisición', tipo: 'money', pista: 'Hace falta para la plusvalía y para la ganancia patrimonial.' },
  ],
  'IN-03': [
    { clave: 'calificacionEnergetica', etiqueta: 'Calificación', tipo: 'select', opciones: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
    { clave: 'consumoEnergetico', etiqueta: 'Consumo', tipo: 'text', pista: 'kWh/m² al año.' },
    { clave: 'emisionesCO2', etiqueta: 'Emisiones', tipo: 'text', pista: 'kg CO₂/m² al año.' },
    { clave: 'registroCEE', etiqueta: 'Número de registro autonómico', tipo: 'text' },
    { clave: 'tecnicoCEE', etiqueta: 'Técnico certificador', tipo: 'text' },
    { clave: 'ceeEmitido', etiqueta: 'Fecha de emisión', tipo: 'date', pista: 'Vale 10 años, 5 si la calificación es G.' },
  ],
  'IN-04': [
    { clave: 'cedulaNumero', etiqueta: 'Número de cédula', tipo: 'text' },
    { clave: 'cedulaEmitida', etiqueta: 'Fecha de expedición', tipo: 'date' },
    { clave: 'cedulaCaduca', etiqueta: 'Fecha de caducidad', tipo: 'date', pista: 'La lleva impresa: 15 o 25 años según la comunidad.' },
    { clave: 'cedulaOcupacion', etiqueta: 'Ocupación máxima', tipo: 'text', pista: 'Número de personas.' },
  ],
  'IN-05': [
    { clave: 'comunidadAlCorriente', etiqueta: '¿Al corriente de pago?', tipo: 'select', opciones: ['Sí', 'No'] },
    { clave: 'comunidadDeuda', etiqueta: 'Deuda pendiente', tipo: 'money' },
    { clave: 'comunidadCuota', etiqueta: 'Cuota mensual', tipo: 'money', pista: 'El comprador la va a preguntar seguro.' },
    { clave: 'comunidadDerramas', etiqueta: 'Derramas aprobadas', tipo: 'textarea', pista: 'Aprobadas y pendientes de pago: se transmiten con el piso.' },
    { clave: 'administrador', etiqueta: 'Administrador de fincas', tipo: 'text' },
  ],
  'IN-06': [
    { clave: 'ibiImporte', etiqueta: 'Importe anual', tipo: 'money' },
    { clave: 'ibiEjercicio', etiqueta: 'Ejercicio', tipo: 'text' },
    { clave: 'valorCatastral', etiqueta: 'Valor catastral', tipo: 'money', pista: 'Base de la plusvalía municipal.' },
    { clave: 'refCatastral', etiqueta: 'Referencia catastral', tipo: 'text', alExpediente: 'refCatastral' },
  ],
  'IN-07': [
    { clave: 'iteResultado', etiqueta: 'Resultado', tipo: 'select', opciones: ['Favorable', 'Favorable con deficiencias', 'Desfavorable'] },
    { clave: 'iteFecha', etiqueta: 'Fecha de la inspección', tipo: 'date' },
    { clave: 'iteDeficiencias', etiqueta: 'Deficiencias', tipo: 'textarea', pista: 'Si las hay, quién las paga es materia de negociación.' },
    { clave: 'iteProximaEn', etiqueta: 'Próxima inspección', tipo: 'date' },
  ],
  'IN-08': [
    { clave: 'refCatastral', etiqueta: 'Referencia catastral', tipo: 'text', alExpediente: 'refCatastral' },
    { clave: 'superficieCatastral', etiqueta: 'Superficie construida', tipo: 'number', alExpediente: 'superficie', pista: 'm² según Catastro. Casi nunca coincide con la registral, y eso no es un error.' },
    { clave: 'superficieUtilCatastro', etiqueta: 'Superficie útil', tipo: 'number' },
    { clave: 'anioConstruccion', etiqueta: 'Año de construcción', tipo: 'number', alExpediente: 'anioConstruccion' },
    { clave: 'usoCatastral', etiqueta: 'Uso', tipo: 'text', pista: 'Residencial, garaje, trastero…' },
  ],
  'IN-09': [
    { clave: 'cupsLuz', etiqueta: 'CUPS de electricidad', tipo: 'text', pista: 'Hace falta para el cambio de titular.' },
    { clave: 'cupsGas', etiqueta: 'CUPS de gas', tipo: 'text' },
    { clave: 'contratoAgua', etiqueta: 'Contrato de agua', tipo: 'text' },
    { clave: 'suministrosAlCorriente', etiqueta: '¿Al corriente?', tipo: 'select', opciones: ['Sí', 'No'] },
  ],
  'IN-10': [
    { clave: 'licenciaOcupacion', etiqueta: 'Nº de licencia de primera ocupación', tipo: 'text' },
    { clave: 'licenciaFecha', etiqueta: 'Fecha de la licencia', tipo: 'date' },
    { clave: 'promotor', etiqueta: 'Promotor', tipo: 'text' },
    { clave: 'garantiaDecenal', etiqueta: 'Seguro decenal', tipo: 'text', pista: 'Compañía y número de póliza.' },
  ],

  // ─── Partes ───────────────────────────────────────────────────────────────
  'PT-01': [
    { clave: 'vendedorNif', etiqueta: 'NIF del vendedor', tipo: 'nif', alExpediente: 'vendedorNif' },
    { clave: 'vendedorNifCaduca', etiqueta: 'Caducidad del documento del vendedor', tipo: 'date', pista: 'Un DNI caducado el día de la firma la para.' },
    { clave: 'compradorNif', etiqueta: 'NIF del comprador', tipo: 'nif', alExpediente: 'compradorNif' },
    { clave: 'compradorNifCaduca', etiqueta: 'Caducidad del documento del comprador', tipo: 'date' },
  ],
  'PT-02': [
    { clave: 'vendedorEstadoCivil', etiqueta: 'Estado civil del vendedor', tipo: 'text', alExpediente: 'vendedorEstadoCivil' },
    { clave: 'regimenMatrimonial', etiqueta: 'Régimen económico', tipo: 'select', opciones: ['Gananciales', 'Separación de bienes', 'Participación', 'No aplica'] },
    { clave: 'consentimientoConyuge', etiqueta: '¿Hace falta el consentimiento del cónyuge?', tipo: 'select', opciones: ['Sí', 'No'] },
    { clave: 'capitulaciones', etiqueta: 'Capitulaciones', tipo: 'text', pista: 'Notaría, protocolo y fecha, si las hay.' },
  ],
  'PT-03': [
    { clave: 'poderdante', etiqueta: 'Poderdante', tipo: 'text' },
    { clave: 'apoderado', etiqueta: 'Apoderado', tipo: 'text' },
    { clave: 'poderNotaria', etiqueta: 'Notaría', tipo: 'text' },
    { clave: 'poderProtocolo', etiqueta: 'Protocolo', tipo: 'text' },
    { clave: 'poderFacultades', etiqueta: '¿Incluye vender este inmueble?', tipo: 'select', opciones: ['Sí', 'No'], pista: 'Un poder general no siempre basta.' },
  ],
  'PT-04': [
    { clave: 'nieComprador', etiqueta: 'NIE', tipo: 'nif', alExpediente: 'compradorNif' },
    { clave: 'nieEmitido', etiqueta: 'Fecha de expedición', tipo: 'date' },
    { clave: 'paisResidencia', etiqueta: 'País de residencia', tipo: 'text' },
  ],
  'PT-05': [
    { clave: 'arras', etiqueta: 'Importe de las arras', tipo: 'money', alExpediente: 'arras' },
    { clave: 'precio', etiqueta: 'Precio pactado', tipo: 'money', alExpediente: 'precio' },
    { clave: 'arrasFechaLimite', etiqueta: 'Fecha límite de firma', tipo: 'date', alExpediente: 'fechaFirma', pista: 'Pasada esta fecha se pierden las arras o se devuelven dobladas.' },
    { clave: 'arrasTipo', etiqueta: 'Tipo de arras', tipo: 'select', opciones: ['Penitenciales', 'Confirmatorias', 'Penales'] },
    { clave: 'arrasFirmado', etiqueta: 'Fecha del contrato', tipo: 'date' },
  ],
  'PT-06': [
    { clave: 'encargoHonorarios', etiqueta: 'Honorarios', tipo: 'text' },
    { clave: 'encargoExclusiva', etiqueta: '¿En exclusiva?', tipo: 'select', opciones: ['Sí', 'No'] },
    { clave: 'encargoVigencia', etiqueta: 'Vigencia del encargo', tipo: 'date' },
  ],
  'PT-07': [
    { clave: 'causante', etiqueta: 'Causante', tipo: 'text' },
    { clave: 'fallecimiento', etiqueta: 'Fecha de fallecimiento', tipo: 'date' },
    { clave: 'herederos', etiqueta: 'Herederos', tipo: 'textarea', pista: 'Tienen que comparecer todos, o dar poder.' },
    { clave: 'herenciaProtocolo', etiqueta: 'Protocolo de la adjudicación', tipo: 'text' },
    { clave: 'impuestoSucesiones', etiqueta: '¿Liquidado el impuesto de sucesiones?', tipo: 'select', opciones: ['Sí', 'No'], pista: 'Sin liquidar, el Registro no inscribe.' },
  ],

  // ─── Financiación ─────────────────────────────────────────────────────────
  'FN-01': [
    { clave: 'entidad', etiqueta: 'Entidad', tipo: 'text' },
    { clave: 'capitalHipoteca', etiqueta: 'Capital concedido', tipo: 'money' },
    { clave: 'plazoHipoteca', etiqueta: 'Plazo', tipo: 'text', pista: 'En años.' },
    { clave: 'tipoInteres', etiqueta: 'Tipo de interés', tipo: 'text', pista: 'TIN. Si es variable, diferencial y referencia.' },
    { clave: 'tae', etiqueta: 'TAE', tipo: 'text' },
    { clave: 'feinEmitida', etiqueta: 'Fecha de la FEIN', tipo: 'date', pista: 'Los 10 días de reflexión cuentan desde aquí.' },
  ],
  'FN-02': [
    { clave: 'fiaeClausulas', etiqueta: 'Cláusulas advertidas', tipo: 'textarea', pista: 'Suelo, divisa, vencimiento anticipado…' },
    { clave: 'fiaeFecha', etiqueta: 'Fecha', tipo: 'date' },
  ],
  'FN-03': [
    { clave: 'actaNotaria', etiqueta: 'Notaría', tipo: 'text' },
    { clave: 'actaFecha', etiqueta: 'Fecha del acta', tipo: 'date', pista: 'Tiene que ser anterior a la firma, no el mismo día.' },
    { clave: 'actaResultado', etiqueta: 'Resultado', tipo: 'select', opciones: ['Favorable', 'Con reservas'] },
  ],
  'FN-04': [
    { clave: 'valorTasacion', etiqueta: 'Valor de tasación', tipo: 'money' },
    { clave: 'tasadora', etiqueta: 'Sociedad de tasación', tipo: 'text' },
    { clave: 'tasacionFecha', etiqueta: 'Fecha', tipo: 'date', pista: 'Vale 6 meses.' },
    { clave: 'superficieTasacion', etiqueta: 'Superficie comprobada', tipo: 'number', alExpediente: 'superficie', pista: 'La que midió el tasador sobre el terreno.' },
  ],
  'FN-05': [
    { clave: 'deudaPendiente', etiqueta: 'Deuda pendiente', tipo: 'money', pista: 'Lo que hay que cancelar el día de la firma.' },
    { clave: 'acreedor', etiqueta: 'Entidad acreedora', tipo: 'text' },
    { clave: 'comisionCancelacion', etiqueta: 'Comisión de cancelación', tipo: 'money' },
    { clave: 'deudaFecha', etiqueta: 'Fecha del certificado', tipo: 'date', pista: 'Vale 15 días: se pide muy pegado a la firma.' },
  ],

  // ─── Fiscal y blanqueo ────────────────────────────────────────────────────
  'FS-01': [
    { clave: 'medioPago', etiqueta: 'Medio de pago', tipo: 'select', opciones: ['Transferencia', 'Cheque bancario', 'Efectivo', 'Subrogación'] },
    { clave: 'importePago', etiqueta: 'Importe justificado', tipo: 'money' },
    { clave: 'ordenantePago', etiqueta: 'Ordenante', tipo: 'text', pista: 'Tiene que ser el comprador: si no, el notario pregunta.' },
    { clave: 'cuentaOrigen', etiqueta: 'Cuenta de origen', tipo: 'text' },
  ],
  'FS-02': [
    { clave: 'titularReal', etiqueta: 'Titular real', tipo: 'text' },
    { clave: 'origenFondos', etiqueta: 'Origen de los fondos', tipo: 'textarea' },
    { clave: 'pep', etiqueta: '¿Persona con responsabilidad pública?', tipo: 'select', opciones: ['Sí', 'No'] },
  ],
  'FS-03': [
    { clave: 'impuestoTipo', etiqueta: 'Impuesto', tipo: 'select', opciones: ['ITP', 'IVA + AJD'] },
    { clave: 'impuestoTipoGravamen', etiqueta: 'Tipo aplicable', tipo: 'text', pista: 'Cambia por comunidad y por edad del comprador.' },
    { clave: 'impuestoImporte', etiqueta: 'Importe provisionado', tipo: 'money' },
  ],
  'FS-04': [
    { clave: 'plusvaliaImporte', etiqueta: 'Importe', tipo: 'money' },
    { clave: 'plusvaliaMetodo', etiqueta: 'Método de cálculo', tipo: 'select', opciones: ['Objetivo', 'Real'], pista: 'Se puede elegir el que salga más barato.' },
    { clave: 'plusvaliaPlazo', etiqueta: 'Fin de plazo', tipo: 'date', pista: '30 días hábiles desde la firma.' },
  ],
  'FS-05': [
    { clave: 'retencion3', etiqueta: 'Importe retenido', tipo: 'money', pista: 'El 3 % del precio.' },
    { clave: 'modelo211Fecha', etiqueta: 'Fecha de presentación', tipo: 'date', pista: 'Un mes desde la firma.' },
  ],

  // ─── Notaría ──────────────────────────────────────────────────────────────
  'NT-01': [
    { clave: 'notaria', etiqueta: 'Notaría', tipo: 'text', alExpediente: 'notaria' },
    { clave: 'notariaFechaFirma', etiqueta: 'Día y hora de la firma', tipo: 'date', alExpediente: 'fechaFirma', pista: 'Si cae después del límite de las arras, Timbre lo señala.' },
    { clave: 'notarioNombre', etiqueta: 'Notario', tipo: 'text' },
  ],
  'NT-02': [
    { clave: 'gastosNotaria', etiqueta: 'Gastos de notaría', tipo: 'money' },
    { clave: 'gastosRegistro', etiqueta: 'Gastos de registro', tipo: 'money' },
    { clave: 'gastosGestoria', etiqueta: 'Gestoría', tipo: 'money' },
    { clave: 'repartoGastos', etiqueta: 'Reparto pactado', tipo: 'textarea', pista: 'Lo que dice la ley y lo que han pactado no siempre coinciden.' },
  ],
  'NT-03': [
    { clave: 'chequeImporte', etiqueta: 'Importe', tipo: 'money' },
    { clave: 'chequeEmisor', etiqueta: 'Entidad emisora', tipo: 'text' },
    { clave: 'chequeBeneficiario', etiqueta: 'Beneficiario', tipo: 'text', pista: 'Nominativo a favor del vendedor.' },
    { clave: 'chequeFecha', etiqueta: 'Fecha de emisión', tipo: 'date' },
  ],
  'NT-04': [
    { clave: 'llavesFecha', etiqueta: 'Fecha de entrega', tipo: 'date' },
    { clave: 'lecturaLuz', etiqueta: 'Lectura del contador de luz', tipo: 'text' },
    { clave: 'lecturaAgua', etiqueta: 'Lectura del contador de agua', tipo: 'text' },
    { clave: 'juegosLlaves', etiqueta: 'Juegos de llaves entregados', tipo: 'number' },
    { clave: 'estadoVivienda', etiqueta: 'Estado de la vivienda', tipo: 'textarea' },
  ],
}

/** Los campos de un tipo de documento, o una lista vacía si no hay esquema. */
export function esquemaDe(reqId: string | null | undefined): CampoDoc[] {
  return (reqId && ESQUEMAS[reqId]) || []
}

/** Todos los campos conocidos, por clave, para poder etiquetar un dato suelto. */
export const CAMPO_POR_CLAVE: Record<string, CampoDoc> = Object.fromEntries(
  Object.values(ESQUEMAS).flat().map((c) => [c.clave, c])
)

/** De qué requisitos puede salir un dato. Un mismo dato lo dicen varios papeles. */
export const REQS_QUE_DICEN: Record<string, string[]> = (() => {
  const mapa: Record<string, string[]> = {}
  for (const [reqId, campos] of Object.entries(ESQUEMAS)) {
    for (const campo of campos) {
      ;(mapa[campo.clave] ??= []).push(reqId)
    }
  }
  return mapa
})()
