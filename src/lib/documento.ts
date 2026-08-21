import { applyFilter } from './format'
import type { Campo } from '../types'

/**
 * Cómo se lee el cuerpo de una plantilla.
 *
 * El marcado es deliberadamente corto —`#` título, `§` cláusula, `>` nota, `-`
 * regla— porque lo escribe el agente y tiene que caber en la cabeza. Esta
 * lectura vive aquí y no dentro de la hoja porque la pantalla, el PDF y el
 * .docx tienen que decir exactamente lo mismo: si cada uno interpretara el
 * cuerpo por su cuenta, acabarían discrepando en algo y el agente mandaría a
 * la notaría un documento distinto del que revisó.
 */

const tokenRe = () => /\{\{([a-zA-Z0-9_]+)(?:\|([a-z]+))?\}\}/g

export type TipoLinea = 'titulo' | 'clausula' | 'nota' | 'regla' | 'parrafo'

export type Trozo =
  | { tipo: 'texto'; texto: string }
  /** Un hueco de la plantilla. `valor` vacío significa que está sin rellenar. */
  | { tipo: 'hueco'; clave: string; valor: string; etiqueta: string }

export interface LineaDoc {
  tipo: TipoLinea
  trozos: Trozo[]
}

/** Parte una línea en texto y huecos, con los valores ya pasados por su filtro. */
export function trocear(
  linea: string,
  valores: Record<string, string> | undefined,
  campos: Campo[] | undefined
): Trozo[] {
  const trozos: Trozo[] = []
  let ultimo = 0
  let m: RegExpExecArray | null
  const re = tokenRe()
  while ((m = re.exec(linea)) !== null) {
    if (m.index > ultimo) trozos.push({ tipo: 'texto', texto: linea.slice(ultimo, m.index) })
    const clave = m[1]
    const bruto = valores?.[clave]
    const def = campos?.find((c) => c.clave === clave)
    trozos.push({
      tipo: 'hueco',
      clave,
      valor:
        bruto !== undefined && bruto !== null && String(bruto).trim() !== ''
          ? applyFilter(bruto, m[2])
          : '',
      etiqueta: def?.etiqueta || clave,
    })
    ultimo = m.index + m[0].length
  }
  if (ultimo < linea.length) trozos.push({ tipo: 'texto', texto: linea.slice(ultimo) })
  return trozos
}

/** El cuerpo entero, línea a línea y sin las vacías. */
export function leer(
  cuerpo: string,
  valores: Record<string, string> | undefined,
  campos: Campo[] | undefined
): LineaDoc[] {
  const salida: LineaDoc[] = []
  for (const cruda of cuerpo.split('\n')) {
    const linea = cruda.trimEnd()
    if (linea === '') continue
    if (linea === '-') {
      salida.push({ tipo: 'regla', trozos: [] })
    } else if (linea.startsWith('# ')) {
      salida.push({ tipo: 'titulo', trozos: trocear(linea.slice(2), valores, campos) })
    } else if (linea.startsWith('§ ')) {
      salida.push({ tipo: 'clausula', trozos: trocear(linea.slice(2), valores, campos) })
    } else if (linea.startsWith('> ')) {
      salida.push({ tipo: 'nota', trozos: trocear(linea.slice(2), valores, campos) })
    } else {
      salida.push({ tipo: 'parrafo', trozos: trocear(linea, valores, campos) })
    }
  }
  return salida
}

/** El texto llano, con los huecos vacíos entre corchetes. Para índices y avisos. */
export function comoTexto(lineas: LineaDoc[]): string {
  return lineas
    .map((l) =>
      l.tipo === 'regla'
        ? '—'
        : l.trozos.map((t) => (t.tipo === 'texto' ? t.texto : t.valor || `[${t.etiqueta}]`)).join('')
    )
    .join('\n')
}
