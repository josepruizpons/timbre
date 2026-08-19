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

export interface UserInfo {
  id: number
  email: string
  nombre: string
  colegiado: string | null
  agencia: {
    id: number
    nombre: string
  }
}

export interface ActualizarRequisitoDTO {
  estado?: EstadoRequisito
  emitido?: string | null
  plantillaId?: string | null
  valores?: Record<string, string>
  nota?: string
}

/** Cuerpo de alta o edición de una plantilla. */
export type PlantillaDTO = Omit<Plantilla, 'id' | 'usos'> & { id?: string }
