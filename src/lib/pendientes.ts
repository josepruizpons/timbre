import { resumen } from './expediente'
import { diasHasta } from './format'
import type { Expediente, Plantilla, RequisitoEvaluado } from '../types'

/**
 * Lo que estás esperando, y de quién.
 *
 * De los 31 requisitos del catálogo, **20 dependen de que otra persona te mande
 * algo**: 11 el vendedor, 9 el comprador. El WhatsApp del agente no es
 * transporte de ficheros, es la persecución — y eso es lo que la aplicación no
 * sabía decir.
 *
 * Aquí no hay estado nuevo: todo sale del catálogo (`responsable`) y de las
 * fechas que el requisito ya apunta al pasar a «en curso».
 */

/** Quién aporta cada cosa, en el orden en que el agente los tiene en la cabeza. */
export const RESPONSABLES = ['Vendedor', 'Comprador', 'Ambas partes', 'Agencia'] as const

/** Cuántos días se deja pasar antes de considerar que toca insistir. */
const PACIENCIA = 7

export interface Pendiente {
  req: RequisitoEvaluado
  expedienteId: string
  referencia: string
  direccion: string
  /** Quién lo tiene que aportar, según el catálogo. */
  responsable: string
  /** Días desde que se pidió, o `null` si todavía no se ha pedido. */
  esperando: number | null
  /** Días desde el último recordatorio. */
  desdeRecordatorio: number | null
  /** Lleva pedido más de una semana sin recordar: toca insistir. */
  tocaInsistir: boolean
  /** La plantilla de petición que sirve para reclamarlo, si la hay. */
  peticion: Plantilla | null
}

/** El nombre de la persona concreta, no el papel: «Marta Puig», no «Vendedor». */
export function personaDe(exp: Expediente, responsable: string): string {
  if (responsable === 'Vendedor') return exp.vendedor || 'La parte vendedora'
  if (responsable === 'Comprador') return exp.comprador || 'La parte compradora'
  if (responsable === 'Ambas partes') return 'Vendedor y comprador'
  return 'La agencia'
}

/**
 * Una plantilla sirve para reclamar un requisito si es de ese requisito. De las
 * nueve sembradas, seis no son documentos propios sino solicitudes a un
 * tercero: el ciclo completo es pedir → esperar → recibir → vigilar vigencia, y
 * «pedir» ya estaba resuelto sin que nadie lo usara desde aquí.
 */
function peticionPara(reqId: string, plantillas: Plantilla[]): Plantilla | null {
  return plantillas.find((p) => p.requisito === reqId) ?? null
}

/** Lo que falta en un expediente, sea o no de otra persona. */
export function pendientesDe(exp: Expediente, plantillas: Plantilla[] = []): Pendiente[] {
  return resumen(exp)
    .reqs.filter((r) => r.estado === 'pendiente' || r.estado === 'curso' || r.estado === 'caducado')
    .map((req) => {
      const esperando = req.pedido ? -(diasHasta(req.pedido) ?? 0) : null
      const desdeRecordatorio = req.recordado ? -(diasHasta(req.recordado) ?? 0) : null
      return {
        req,
        expedienteId: exp.id,
        referencia: exp.referencia,
        direccion: exp.direccion,
        responsable: req.def.responsable,
        esperando,
        desdeRecordatorio,
        tocaInsistir:
          esperando !== null &&
          esperando >= PACIENCIA &&
          (desdeRecordatorio === null || desdeRecordatorio >= PACIENCIA),
        peticion: peticionPara(req.id, plantillas),
      }
    })
}

export interface GrupoPendientes {
  responsable: string
  persona: string
  items: Pendiente[]
  /** Cuántos bloquean la firma. */
  criticos: number
  /** Cuántos llevan pedidos más de la cuenta. */
  insistir: number
}

/** Los pendientes de un expediente, repartidos por quién los tiene que traer. */
export function porPersona(exp: Expediente, plantillas: Plantilla[] = []): GrupoPendientes[] {
  const items = pendientesDe(exp, plantillas)
  return RESPONSABLES.map((responsable) => {
    const suyos = items.filter((p) => p.responsable === responsable)
    return {
      responsable,
      persona: personaDe(exp, responsable),
      items: suyos,
      criticos: suyos.filter((p) => p.req.def.critico).length,
      insistir: suyos.filter((p) => p.tocaInsistir).length,
    }
  }).filter((g) => g.items.length > 0)
}

/**
 * Todo lo que la agencia está esperando, de toda la cartera, ordenado por lo
 * que lleva más tiempo pedido.
 *
 * Solo lo que ya se pidió: lo que aún no se ha pedido es trabajo del agente, no
 * espera de otro, y mezclarlo convertiría esta pantalla en la lista de tareas
 * de siempre — que es justo de lo que se quiere salir.
 */
export function loQueEsperamos(expedientes: Expediente[], plantillas: Plantilla[] = []): Pendiente[] {
  return expedientes
    .filter((e) => e.estado === 'activo')
    .flatMap((e) => pendientesDe(e, plantillas))
    .filter((p) => p.esperando !== null)
    .sort((a, b) => (b.esperando ?? 0) - (a.esperando ?? 0))
}
