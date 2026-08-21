import { POR_ID, requisitosDe, BLOQUES } from '../data/catalog'
import { addDays, diasHasta, euros, fechaLarga } from './format'
import type {
  Bloque,
  Campo,
  Expediente,
  EstadoEfectivo,
  Plantilla,
  RegistroRequisito,
  RequisitoEvaluado,
  UserInfo,
} from '../types'

export const ESTADO_ORDEN: Record<string, number> = {
  caducado: 0, caduca: 1, pendiente: 2, curso: 3, vigente: 4
}

/**
 * Estado efectivo de un requisito: combina lo marcado por el agente con la
 * caducidad derivada de la fecha de emisión y la vigencia del catálogo.
 */
export function evaluar(
  reqId: string,
  registro: RegistroRequisito | undefined
): RequisitoEvaluado {
  const def = POR_ID[reqId]
  const r: RegistroRequisito = registro ?? {
    estado: 'pendiente', emitido: null, valores: {}, plantillaId: null, nota: '',
    pedido: null, recordado: null
  }
  const base = {
    id: reqId,
    def,
    plantillaId: r.plantillaId || null,
    valores: r.valores || {},
    nota: r.nota || '',
    emitido: r.emitido || null,
    pedido: r.pedido || null,
    recordado: r.recordado || null,
    caduca: null as string | null,
    dias: null as number | null,
  }

  if (r.estado !== 'aportado') {
    return { ...base, estado: (r.estado === 'curso' ? 'curso' : 'pendiente') as EstadoEfectivo }
  }

  if (!def.vigencia || !r.emitido) {
    return { ...base, estado: 'vigente' }
  }

  const caduca = addDays(r.emitido, def.vigencia)
  const dias = diasHasta(caduca)
  // Un documento que caduca después de la firma sigue sirviendo para firmar,
  // pero avisamos igualmente: las firmas se retrasan.
  const umbral = def.vigencia <= 30 ? 7 : 20
  let estado: EstadoEfectivo = 'vigente'
  if (dias === null) estado = 'vigente'
  else if (dias < 0) estado = 'caducado'
  else if (dias <= umbral) estado = 'caduca'

  return { ...base, estado, caduca, dias }
}

/** Todos los requisitos aplicables al expediente, ya evaluados. */
export function requisitosEvaluados(expediente: Expediente): RequisitoEvaluado[] {
  return requisitosDe(expediente).map((def) => evaluar(def.id, expediente.reqs?.[def.id]))
}

export const esConforme = (estado: EstadoEfectivo) => estado === 'vigente'

export interface ResumenExpediente {
  total: number
  conformes: number
  bloqueos: number
  caducados: number
  porCaducar: number
  alertas: number
  enCurso: number
  progreso: number
  reqs: RequisitoEvaluado[]
}

export function resumen(expediente: Expediente): ResumenExpediente {
  const reqs = requisitosEvaluados(expediente)
  const total = reqs.length
  const conformes = reqs.filter((r) => esConforme(r.estado)).length
  // Un requisito en curso todavía no bloquea: hay alguien trabajándolo.
  const bloqueos = reqs.filter(
    (r) => r.def.critico && (r.estado === 'pendiente' || r.estado === 'caducado')
  ).length
  const caducados = reqs.filter((r) => r.estado === 'caducado').length
  const porCaducar = reqs.filter((r) => r.estado === 'caduca').length
  const enCurso = reqs.filter((r) => r.estado === 'curso').length
  return {
    total,
    conformes,
    bloqueos,
    caducados,
    porCaducar,
    alertas: caducados + porCaducar,
    enCurso,
    progreso: total ? conformes / total : 0,
    reqs
  }
}

export interface BloqueEvaluado extends Bloque {
  items: RequisitoEvaluado[]
  conformes: number
  total: number
}

export function porBloque(reqs: RequisitoEvaluado[]): BloqueEvaluado[] {
  return BLOQUES.map((b) => {
    const items = reqs.filter((r) => r.id.startsWith(b.sigla))
    return {
      ...b,
      items,
      conformes: items.filter((r) => esConforme(r.estado)).length,
      total: items.length
    }
  }).filter((b) => b.total > 0)
}

export type ContextoAuto = Record<string, string | number | null>

/** Contexto de autorrelleno que alimenta los campos `auto` de las plantillas. */
export function contextoDe(expediente: Expediente, agente: UserInfo | null): ContextoAuto {
  return {
    vendedor: expediente.vendedor,
    vendedorNif: expediente.vendedorNif,
    vendedorEstadoCivil: expediente.vendedorEstadoCivil,
    comprador: expediente.comprador,
    compradorNif: expediente.compradorNif,
    compradorEstadoCivil: expediente.compradorEstadoCivil,
    direccion: `${expediente.direccion}, ${expediente.cp ?? ''} ${expediente.municipio}`.trim(),
    municipio: expediente.municipio,
    provincia: expediente.provincia,
    refCatastral: expediente.refCatastral,
    fincaRegistral: expediente.fincaRegistral,
    registro: expediente.registro,
    superficie: expediente.superficie,
    anioConstruccion: expediente.anioConstruccion,
    precio: expediente.precio,
    arras: expediente.arras,
    fechaFirma: expediente.fechaFirma,
    notaria: expediente.notaria,
    // El agente ya no es una constante del código: sale de la sesión.
    agente: agente?.nombre ?? '',
    agencia: agente?.agencia.nombre ?? '',
    hoy: hoyISO(),
    arrasLinea: `Arras por importe de ${euros(expediente.arras)}, entregadas mediante transferencia bancaria a favor de la parte vendedora.`
  }
}

function hoyISO(): string {
  const dt = new Date()
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** Valores iniciales de una plantilla para un expediente concreto. */
export function precargar(
  plantilla: Plantilla,
  expediente: Expediente,
  agente: UserInfo | null,
  valoresPrevios: Record<string, string> = {}
): Record<string, string> {
  const ctx = contextoDe(expediente, agente)
  const out: Record<string, string> = {}
  for (const campo of plantilla.campos) {
    if (valoresPrevios[campo.clave] !== undefined && valoresPrevios[campo.clave] !== '') {
      out[campo.clave] = valoresPrevios[campo.clave]
    } else if (campo.auto && ctx[campo.auto] !== undefined && ctx[campo.auto] !== null) {
      out[campo.clave] = String(ctx[campo.auto])
    } else {
      out[campo.clave] = ''
    }
  }
  return out
}

export interface Completitud {
  requeridos: number
  requeridosListos: number
  completo: boolean
  rellenos: number
  campos: number
}

export function completitud(
  plantilla: { campos: Campo[] },
  valores: Record<string, string> | undefined
): Completitud {
  const requeridos = plantilla.campos.filter((c) => c.requerido)
  const listos = requeridos.filter((c) => String(valores?.[c.clave] ?? '').trim() !== '')
  const todos = plantilla.campos.filter((c) => String(valores?.[c.clave] ?? '').trim() !== '')
  return {
    requeridos: requeridos.length,
    requeridosListos: listos.length,
    completo: listos.length === requeridos.length,
    rellenos: todos.length,
    campos: plantilla.campos.length
  }
}

export function urgenciaFirma(expediente: Expediente): number | null {
  return diasHasta(expediente.fechaFirma)
}

export function etiquetaFirma(expediente: Expediente): string {
  const dias = urgenciaFirma(expediente)
  if (dias === null) return '—'
  if (dias < 0) return `firma vencida hace ${Math.abs(dias)} d`
  if (dias === 0) return 'firma hoy'
  if (dias === 1) return 'firma mañana'
  return `firma en ${dias} d`
}

export { fechaLarga }
