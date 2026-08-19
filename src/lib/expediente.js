import { POR_ID, requisitosDe, BLOQUES } from '../data/catalog.js'
import { addDays, diasHasta, HOY } from './format.js'
import { AGENTE } from '../data/cases.js'
import { euros, fechaLarga } from './format.js'

export const ESTADO_ORDEN = { caducado: 0, caduca: 1, pendiente: 2, curso: 3, vigente: 4 }

/**
 * Estado efectivo de un requisito: combina lo marcado por el agente con la
 * caducidad derivada de la fecha de emisión y la vigencia del catálogo.
 */
export function evaluar(reqId, registro, expediente) {
  const def = POR_ID[reqId]
  const r = registro || { estado: 'pendiente', emitido: null, valores: {}, plantillaId: null }
  const base = {
    id: reqId,
    def,
    plantillaId: r.plantillaId || null,
    valores: r.valores || {},
    nota: r.nota || '',
    emitido: r.emitido || null,
    caduca: null,
    dias: null
  }

  if (r.estado !== 'aportado') {
    return { ...base, estado: r.estado === 'curso' ? 'curso' : 'pendiente' }
  }

  if (!def.vigencia || !r.emitido) {
    return { ...base, estado: 'vigente' }
  }

  const caduca = addDays(r.emitido, def.vigencia)
  const dias = diasHasta(caduca)
  // Un documento que caduca después de la firma sigue sirviendo para firmar,
  // pero avisamos igualmente: las firmas se retrasan.
  const umbral = def.vigencia <= 30 ? 7 : 20
  let estado = 'vigente'
  if (dias < 0) estado = 'caducado'
  else if (dias <= umbral) estado = 'caduca'

  return { ...base, estado, caduca, dias }
}

/** Todos los requisitos aplicables al expediente, ya evaluados. */
export function requisitosEvaluados(expediente) {
  return requisitosDe(expediente).map((def) => evaluar(def.id, expediente.reqs?.[def.id], expediente))
}

export const esConforme = (estado) => estado === 'vigente'

export function resumen(expediente) {
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

export function porBloque(reqs) {
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

/** Contexto de autorrelleno que alimenta los campos `auto` de las plantillas. */
export function contextoDe(expediente) {
  return {
    vendedor: expediente.vendedor,
    vendedorNif: expediente.vendedorNif,
    vendedorEstadoCivil: expediente.vendedorEstadoCivil,
    comprador: expediente.comprador,
    compradorNif: expediente.compradorNif,
    compradorEstadoCivil: expediente.compradorEstadoCivil,
    direccion: `${expediente.direccion}, ${expediente.cp} ${expediente.municipio}`,
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
    agente: AGENTE.nombre,
    agencia: AGENTE.agencia,
    hoy: HOY,
    arrasLinea: `Arras por importe de ${euros(expediente.arras)}, entregadas mediante transferencia bancaria a favor de la parte vendedora.`
  }
}

/** Valores iniciales de una plantilla para un expediente concreto. */
export function precargar(plantilla, expediente, valoresPrevios = {}) {
  const ctx = contextoDe(expediente)
  const out = {}
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

export function completitud(plantilla, valores) {
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

export function urgenciaFirma(expediente) {
  const dias = diasHasta(expediente.fechaFirma)
  if (dias === null) return null
  return dias
}

export function etiquetaFirma(expediente) {
  const dias = urgenciaFirma(expediente)
  if (dias === null) return '—'
  if (dias < 0) return `firma vencida hace ${Math.abs(dias)} d`
  if (dias === 0) return 'firma hoy'
  if (dias === 1) return 'firma mañana'
  return `firma en ${dias} d`
}

export { fechaLarga }
