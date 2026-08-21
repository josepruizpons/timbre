// Convertir un trozo de texto en una variable, y todas sus repeticiones con él.
//
// El modelo es deliberadamente simple: el cuerpo es siempre el texto actual,
// tokens incluidos. Marcar una variable lo reescribe en el acto y los hallazgos
// se vuelven a calcular sobre el texto nuevo. Así no hay offsets guardados que
// puedan quedarse obsoletos, que es de donde salen los errores raros en los
// editores de este tipo.

import { buscarTodo } from './deteccion'
import type { Hallazgo, Rango } from './deteccion'
import type { Campo, TipoCampo } from '../../types'

export interface Marca {
  clave: string
  filtro: string | null
  ocurrencias: Rango[]
}

/** «Precio de compraventa» → `precioDeCompraventa`. */
export function claveDesde(texto: string): string {
  const palabras = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (palabras.length === 0) return ''
  return palabras
    .map((p, i) => (i === 0 ? p.toLowerCase() : p[0].toUpperCase() + p.slice(1).toLowerCase()))
    .join('')
    .slice(0, 40)
}

export function token(clave: string, filtro: string | null): string {
  return filtro ? `{{${clave}|${filtro}}}` : `{{${clave}}}`
}

/**
 * Sustituye las ocurrencias por su token. Se aplica de atrás hacia delante para
 * que cada reemplazo no desplace los que quedan por hacer.
 */
export function marcar(cuerpo: string, marca: Marca): string {
  const pieza = token(marca.clave, marca.filtro)
  const orden = [...marca.ocurrencias].sort((a, b) => b.inicio - a.inicio)
  let salida = cuerpo
  for (const o of orden) {
    salida = salida.slice(0, o.inicio) + pieza + salida.slice(o.fin)
  }
  return salida
}

/** Quita un token del cuerpo y devuelve el literal que ocupaba su lugar. */
export function desmarcar(cuerpo: string, clave: string, literal: string): string {
  const patron = new RegExp(`\\{\\{${clave}(?:\\|[a-z]+)?\\}\\}`, 'g')
  return cuerpo.replace(patron, literal)
}

/** Las repeticiones de un texto en el documento, para poder revisarlas. */
export function repeticiones(cuerpo: string, literal: string): Rango[] {
  return buscarTodo(cuerpo, literal)
}

export interface Recorte {
  antes: string
  medio: string
  despues: string
}

/**
 * El entorno de una ocurrencia, para poder juzgarla en la lista de
 * repeticiones. Los tokens que ya haya alrededor se enseñan por su nombre: leer
 * «‹Dirección completa›» dice algo, leer «{{direccion}}» no.
 */
export function recorte(
  cuerpo: string,
  rango: Rango,
  etiquetas?: Map<string, string>,
  radio = 46
): Recorte {
  const legible = (t: string) =>
    t
      .replace(/\n+/g, ' ')
      .replace(/\{\{([a-zA-Z0-9_]+)(?:\|[a-z]+)?\}\}/g, (_, clave: string) =>
        `\u2039${etiquetas?.get(clave) ?? clave}\u203a`
      )
      // El recorte puede partir un token por la mitad; el trozo suelto no dice
      // nada y se quita. Igual que las marcas de línea del formato.
      .replace(/\{\{[^}]*$/, '')
      .replace(/^[^{]*\}\}/, '')
      .replace(/(^|\s)[#§>]\s/g, '$1')

  const desde = Math.max(0, rango.inicio - radio)
  const hasta = Math.min(cuerpo.length, rango.fin + radio)
  return {
    antes: (desde > 0 ? '…' : '') + legible(cuerpo.slice(desde, rango.inicio)),
    medio: cuerpo.slice(rango.inicio, rango.fin),
    despues: legible(cuerpo.slice(rango.fin, hasta)) + (hasta < cuerpo.length ? '…' : ''),
  }
}

/**
 * Los campos de la plantilla, deducidos de los tokens que hay en el cuerpo.
 * Un campo que aparece dos veces con filtros distintos —el precio en cifra y en
 * letra— es un solo campo: el filtro es cosa del token, no del campo.
 */
export function camposDelCuerpo(cuerpo: string, conocidos: Map<string, Campo>): Campo[] {
  const vistos: string[] = []
  const re = /\{\{([a-zA-Z0-9_]+)(?:\|[a-z]+)?\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(cuerpo)) !== null) {
    if (!vistos.includes(m[1])) vistos.push(m[1])
  }

  return vistos.map((clave) => {
    const conocido = conocidos.get(clave)
    if (conocido) return conocido
    return { clave, etiqueta: clave, tipo: 'text' as TipoCampo, grupo: 'Datos' }
  })
}

/**
 * El campo que corresponde a un hallazgo aceptado.
 *
 * Lo que escribe el agente entra como obligatorio: si el dato está escrito en
 * el documento es porque hace falta, y un contrato con un hueco en blanco es un
 * contrato defectuoso. Lo que se rellena solo desde el expediente no lo es —ya
 * viene puesto, y si el expediente aún no lo tiene, el hueco vacío en la vista
 * previa lo dice más claro que un aspa roja.
 */
export function campoDe(hallazgo: Hallazgo): Campo {
  return {
    clave: hallazgo.clave,
    etiqueta: hallazgo.etiqueta,
    tipo: hallazgo.tipo,
    grupo: hallazgo.grupo,
    requerido: !hallazgo.auto,
    ...(hallazgo.auto ? { auto: hallazgo.auto } : {}),
    ...(hallazgo.opciones ? { opciones: hallazgo.opciones } : {}),
  }
}

/** Claves ya usadas en las plantillas de la agencia, para reaprovecharlas. */
export function vocabularioDe(plantillas: { campos: Campo[] }[]): Campo[] {
  const porClave = new Map<string, Campo>()
  for (const p of plantillas) {
    for (const c of p.campos) {
      if (!porClave.has(c.clave)) porClave.set(c.clave, c)
    }
  }
  return [...porClave.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'))
}
