// Tipos de dominio de Timbre. Espejo de src/types/types.ts en timbre-api: la
// API entrega los expedientes ya en esta forma, con `reqs` como mapa.

export type EstadoExpediente = 'activo' | 'firmado' | 'archivado'
export type EstadoRequisito = 'pendiente' | 'curso' | 'aportado'

/** Estado efectivo de un requisito, ya cruzado con su vigencia. */
export type EstadoEfectivo = EstadoRequisito | 'vigente' | 'caduca' | 'caducado'

export type TipoCampo = 'text' | 'textarea' | 'number' | 'money' | 'date' | 'nif' | 'select'

export interface Campo {
  clave: string
  etiqueta: string
  tipo: TipoCampo
  grupo?: string
  /** Dato del expediente con el que se precarga el campo. */
  auto?: string
  requerido?: boolean
  pista?: string
  /** Solo para `tipo: 'select'`. */
  opciones?: string[]
}

export interface Plantilla {
  id: string
  nombre: string
  requisito: string | null
  autor: string | null
  version: string | null
  actualizada: string | null
  usos: number
  descripcion: string | null
  campos: Campo[]
  cuerpo: string
}

export interface RegistroRequisito {
  estado: EstadoRequisito
  emitido: string | null
  plantillaId: string | null
  valores: Record<string, string>
  nota: string
}

export interface EntradaTraza {
  id: number
  fecha: string
  texto: string
  /** Escrita por la aplicación al cambiar el expediente de estado. */
  automatica: boolean
  /** Nombre del agente que la escribió, o `null` si fue la aplicación. */
  autor: string | null
}

export interface Expediente {
  id: string
  referencia: string
  estado: EstadoExpediente
  fase: string | null

  direccion: string
  municipio: string
  provincia: string | null
  ccaa: string
  cp: string | null
  refCatastral: string | null
  fincaRegistral: string | null
  registro: string | null
  superficie: number | null
  anioConstruccion: number | null

  vendedor: string | null
  vendedorNif: string | null
  vendedorEstadoCivil: string | null
  comprador: string | null
  compradorNif: string | null
  compradorEstadoCivil: string | null

  precio: number | null
  arras: number | null
  fechaFirma: string | null
  notaria: string | null
  protocolo: string | null
  abierto: string | null
  cerrado: string | null

  hipoteca: boolean
  cargaHipotecaria: boolean
  compradorExtranjero: boolean
  vendedorNoResidente: boolean
  obraNueva: boolean
  herencia: boolean
  representacion: boolean
  unifamiliar: boolean

  reqs: Record<string, RegistroRequisito>
  traza: EntradaTraza[]
}

/** Definición de un requisito en el catálogo. */
export interface DefRequisito {
  id: string
  nombre: string
  resumen: string
  emisor: string
  responsable: string
  /** Días de validez del documento una vez emitido; `null` = no caduca. */
  vigencia: number | null
  critico: boolean
  referencia: string
  nota?: string
  /** Decide si el requisito entra en el expediente según sus circunstancias. */
  aplica?: (e: Expediente) => boolean
}

export interface Bloque {
  sigla: string
  nombre: string
  descripcion: string
}

/** Un requisito del catálogo cruzado con lo que consta en el expediente. */
export interface RequisitoEvaluado {
  id: string
  def: DefRequisito
  estado: EstadoEfectivo
  plantillaId: string | null
  valores: Record<string, string>
  nota: string
  emitido: string | null
  caduca: string | null
  dias: number | null
}

export type OrigenDocumento = 'generado' | 'recibido'
export type EstadoDocumento = 'borrador' | 'enviado' | 'firmado' | 'recibido'

export interface Documento {
  id: string
  /** Requisito que cubre, o `null` si solo vive en la carpeta del expediente. */
  reqId: string | null
  origen: OrigenDocumento
  estado: EstadoDocumento
  nombre: string

  /** Solo si es generado: el PDF se produce al descargar, no se almacena. */
  plantillaId: string | null
  valores: Record<string, string>
  congelado: boolean

  /** Solo si es recibido. */
  nombreFichero: string | null
  mime: string | null
  tamano: number | null
  emisor: string | null

  emitido: string | null
  caduca: string | null
  nota: string
  autor: string | null
  creado: string
}

export interface SubidaConcedida {
  documentoId: string
  url: string
  vence: number
}

export type Rol = 'admin' | 'agente'

/** Lo que una agencia puede cambiar de su propia interfaz. */
export interface Marca {
  nombre: string
  nombreCorto: string | null
  lema: string | null
  /** Hexadecimal `#rrggbb`. Gobierna el color de acción de toda la interfaz. */
  colorAcento: string
  logoUrl: string | null
}

export interface Agencia extends Marca {
  id: number
}

export interface UserInfo {
  id: number
  email: string
  nombre: string
  colegiado: string | null
  telefono: string | null
  rol: Rol
  agencia: Agencia
}

/** Ficha de usuario que ve el administrador de la agencia. */
export interface Usuario {
  id: number
  email: string
  nombre: string
  colegiado: string | null
  telefono: string | null
  rol: Rol
  activo: boolean
  ultimoAcceso: string | null
  creado: string | null
  expedientes: number
}

export interface CrearUsuarioDTO {
  email: string
  nombre: string
  password: string
  colegiado?: string | null
  telefono?: string | null
  rol?: Rol
}

export interface ActualizarUsuarioDTO {
  email?: string
  nombre?: string
  colegiado?: string | null
  telefono?: string | null
  rol?: Rol
  activo?: boolean
  password?: string
}

/** Campos del expediente que el formulario de alta y edición escribe. */
export type ExpedienteDTO = Partial<
  Pick<
    Expediente,
    | 'estado' | 'fase'
    | 'direccion' | 'municipio' | 'provincia' | 'ccaa' | 'cp'
    | 'refCatastral' | 'fincaRegistral' | 'registro' | 'superficie' | 'anioConstruccion'
    | 'vendedor' | 'vendedorNif' | 'vendedorEstadoCivil'
    | 'comprador' | 'compradorNif' | 'compradorEstadoCivil'
    | 'precio' | 'arras' | 'fechaFirma' | 'notaria' | 'protocolo' | 'cerrado'
    | 'hipoteca' | 'cargaHipotecaria' | 'compradorExtranjero' | 'vendedorNoResidente'
    | 'obraNueva' | 'herencia' | 'representacion' | 'unifamiliar'
  >
>

export interface ActualizarRequisitoDTO {
  estado?: EstadoRequisito
  emitido?: string | null
  plantillaId?: string | null
  valores?: Record<string, string>
  nota?: string
}

/** Cuerpo de alta o edición de una plantilla. */
export type PlantillaDTO = Omit<Plantilla, 'id' | 'usos'> & { id?: string }
