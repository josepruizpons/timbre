import { CAMPO_POR_CLAVE, type CampoDoc } from '../data/esquemas'
import { DATO_POR_CLAVE } from '../data/contexto'
import { contextoDe } from './expediente'
import type { DatoExpediente, Expediente, UserInfo } from '../types'

/**
 * Lo que el expediente sabe, y de dónde lo sabe.
 *
 * Aquí es donde el expediente deja de ser un formulario y pasa a ser un
 * registro de hechos. Cada hecho junta tres cosas que hasta ahora vivían
 * separadas: lo que dice el formulario del caso, lo que dice cada papel que hay
 * en la carpeta, y quién lo confirmó.
 *
 * La pieza que importa es la discrepancia. La superficie registral y la
 * catastral casi nunca coinciden, y hasta ahora el expediente tenía una casilla
 * «superficie» que se quedaba con la última que alguien tecleó. Con procedencia
 * caben las dos, y Timbre lo dice en vez de elegir en silencio.
 */

/** Una cosa que dice una fuente concreta sobre un hecho. */
export interface Observacion {
  dato: DatoExpediente
  campo: CampoDoc | undefined
  /** La etiqueta del papel: «según la nota simple». */
  segun: string
}

export interface Hecho {
  /** La clave con la que se conoce el hecho: la del expediente si la tiene. */
  clave: string
  etiqueta: string
  grupo: string
  /** Lo que dice el formulario del expediente, si es un campo suyo. */
  delExpediente: string | null
  observaciones: Observacion[]
  /** El valor que hoy vale: el papel más reciente, o el del formulario. */
  valor: string
  /** Dos fuentes dicen cosas distintas. No es un error: es lo que hay. */
  discrepa: boolean
}

/**
 * Compara dos valores como los compararía una persona.
 *
 * «88», «88,00» y «88.00 m²» son la misma superficie, y avisar de una
 * discrepancia por la coma sería ruido que enseña a ignorar los avisos.
 */
export function mismoValor(a: string, b: string): boolean {
  const limpio = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ')
  if (limpio(a) === limpio(b)) return true

  const numero = (v: string) => {
    const solo = v.replace(/[^\d,.-]/g, '')
    if (!solo) return null
    // Formato español: el punto separa miles y la coma decide los decimales.
    const n = Number(solo.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  const na = numero(a)
  const nb = numero(b)
  return na !== null && nb !== null && Math.abs(na - nb) < 0.005
}

/** Con qué nombre se conoce el hecho al que apunta un campo de documento. */
function claveDelHecho(campo: CampoDoc | undefined, clave: string): string {
  return campo?.alExpediente ?? clave
}

function etiquetaDe(clave: string, campo: CampoDoc | undefined): string {
  return DATO_POR_CLAVE[clave]?.etiqueta ?? campo?.etiqueta ?? clave
}

function grupoDe(clave: string, observaciones: Observacion[]): string {
  const delExpediente = DATO_POR_CLAVE[clave]?.grupo
  if (delExpediente) return delExpediente
  const req = observaciones[0]?.dato.reqId
  if (!req) return 'Otros datos'
  const bloques: Record<string, string> = {
    IN: 'Inmueble', PT: 'Partes', FN: 'Financiación', FS: 'Fiscal', NT: 'Notaría',
  }
  return bloques[req.slice(0, 2)] ?? 'Otros datos'
}

/**
 * La ficha del expediente: cada hecho conocido, su valor y su fuente.
 *
 * Los datos del formulario entran aunque no tengan ningún papel detrás; los que
 * salen de un papel entran aunque no sean campo del formulario. Un expediente
 * bien trabajado acaba teniendo más de lo segundo que de lo primero.
 */
export function ficha(
  exp: Expediente,
  datos: DatoExpediente[],
  agente: UserInfo | null
): Hecho[] {
  const ctx = contextoDe(exp, agente)
  const porHecho = new Map<string, Observacion[]>()

  for (const dato of datos) {
    const campo = CAMPO_POR_CLAVE[dato.clave]
    const clave = claveDelHecho(campo, dato.clave)
    const segun = dato.documentoNombre ?? (dato.autor ? `a mano · ${dato.autor}` : 'a mano')
    const lista = porHecho.get(clave) ?? []
    lista.push({ dato, campo, segun })
    porHecho.set(clave, lista)
  }

  // Los campos del formulario del expediente que tienen valor entran siempre:
  // son los que la aplicación usa para ordenar la cartera y decidir requisitos.
  for (const [clave, valor] of Object.entries(ctx)) {
    if (!DATO_POR_CLAVE[clave]) continue
    if (valor === null || valor === undefined || String(valor).trim() === '') continue
    if (!porHecho.has(clave)) porHecho.set(clave, [])
  }

  const hechos: Hecho[] = []
  for (const [clave, observaciones] of porHecho) {
    const bruto = ctx[clave]
    const delExpediente =
      bruto === null || bruto === undefined || String(bruto).trim() === '' ? null : String(bruto)

    // Manda el papel más reciente; si no hay papel, lo que haya en el
    // formulario; y si tampoco, lo que alguien tecleó aquí.
    const dePapel = observaciones
      .filter((o) => o.dato.fuente === 'documento')
      .sort((a, b) => b.dato.actualizado.localeCompare(a.dato.actualizado))
    const aMano = observaciones.filter((o) => o.dato.fuente !== 'documento')
    const valor = dePapel[0]?.dato.valor ?? delExpediente ?? aMano[0]?.dato.valor ?? ''

    const todos = [...observaciones.map((o) => o.dato.valor), ...(delExpediente ? [delExpediente] : [])]
    const discrepa = todos.some((v) => !mismoValor(v, todos[0]))

    hechos.push({
      clave,
      etiqueta: etiquetaDe(clave, observaciones[0]?.campo),
      grupo: grupoDe(clave, observaciones),
      delExpediente,
      observaciones,
      valor,
      discrepa,
    })
  }

  // Primero lo que discrepa: es lo único de esta pantalla que pide una decisión.
  const orden = ['Inmueble', 'Partes', 'Financiación', 'Fiscal', 'Notaría', 'Operación', 'Otros datos']
  return hechos.sort((a, b) => {
    if (a.discrepa !== b.discrepa) return a.discrepa ? -1 : 1
    const ga = orden.indexOf(a.grupo)
    const gb = orden.indexOf(b.grupo)
    if (ga !== gb) return (ga < 0 ? 99 : ga) - (gb < 0 ? 99 : gb)
    return a.etiqueta.localeCompare(b.etiqueta, 'es')
  })
}

/** Los hechos agrupados como se enseñan, respetando el orden de `ficha`. */
export function porGrupo(hechos: Hecho[]): { grupo: string; hechos: Hecho[] }[] {
  const mapa = new Map<string, Hecho[]>()
  for (const h of hechos) {
    const lista = mapa.get(h.grupo) ?? []
    lista.push(h)
    mapa.set(h.grupo, lista)
  }
  return [...mapa.entries()].map(([grupo, hechos]) => ({ grupo, hechos }))
}

/**
 * Cuántos datos del expediente tienen ya un papel detrás.
 *
 * Es la medida de si esto está funcionando: al principio todo lo ha tecleado
 * alguien, y a medida que entran documentos el expediente se va nutriendo solo.
 */
export function respaldo(hechos: Hecho[]): { conPapel: number; total: number } {
  return {
    conPapel: hechos.filter((h) => h.observaciones.some((o) => o.dato.fuente === 'documento')).length,
    total: hechos.length,
  }
}
